"""Build the training matrix in feature_snapshots.

Positives are the 32 real flood events, one snapshot each at the event
timestamp.  Negatives are random monsoon-season timestamps at the same spots,
drawn at Config.NEG_POS_RATIO per positive and kept at least
NEGATIVE_EXCLUSION_HOURS away from any real event at that spot so a near-miss
of a genuine flood is never labelled dry.  No positive label is ever fabricated.

    python -m ml.feature_engineering

The feature functions here are also what ml.predict calls at inference time, so
a served prediction is computed exactly the way the training rows were.
"""
from __future__ import annotations

import math
import random
import sys
from datetime import date, datetime, timedelta, timezone

from config import Config
from data_loader.db import cursor

IST = timezone(timedelta(hours=5, minutes=30))


# --------------------------------------------------------------------------
# Rainfall disaggregation
#
# The rainfall source is daily totals, but flooding is driven by short-burst
# intensity.  We spread each daily total over 24 hours with a Gaussian diurnal
# curve peaked at RAIN_PEAK_HOUR (Mumbai monsoon convection peaks in the late
# afternoon), normalised so the hourly values sum back to the measured daily
# total.  This invents no rainfall: it redistributes a real measurement under a
# documented, configurable shape, and every model that consumes it sees the
# same curve at train and serve time.
# --------------------------------------------------------------------------
def _hourly_weights() -> list[float]:
    sigma = Config.RAIN_DECAY_SIGMA_H
    peak = Config.RAIN_PEAK_HOUR
    weights = []
    for hour in range(24):
        # circular distance so the curve wraps across midnight
        offset = min(abs(hour - peak), 24 - abs(hour - peak))
        weights.append(math.exp(-0.5 * (offset / sigma) ** 2))
    total = sum(weights)
    return [w / total for w in weights]


_WEIGHTS = _hourly_weights()


def hourly_rain(daily_mm: float, hour: int) -> float:
    """Rainfall in the given hour of a day whose total was `daily_mm`."""
    return daily_mm * _WEIGHTS[hour % 24]


class RainfallSeries:
    """Daily rainfall loaded once, with the derived hourly/antecedent lookups."""

    def __init__(self, series: dict[date, float]):
        self.series = series

    @classmethod
    def load(cls) -> "RainfallSeries":
        with cursor() as cur:
            cur.execute("SELECT date, rainfall_mm FROM rainfall_daily ORDER BY date")
            return cls({row[0]: float(row[1]) for row in cur.fetchall()})

    def daily(self, day: date) -> float:
        return self.series.get(day, 0.0)

    def at_hour(self, moment: datetime) -> float:
        """rain_1h — rainfall falling within the snapshot's own hour."""
        local = moment.astimezone(IST)
        return hourly_rain(self.daily(local.date()), local.hour)

    def window(self, moment: datetime, hours: int) -> float:
        """Rainfall over the `hours` ending at `moment`, crossing day bounds."""
        local = moment.astimezone(IST)
        total = 0.0
        for back in range(hours):
            step = local - timedelta(hours=back)
            total += hourly_rain(self.daily(step.date()), step.hour)
        return total

    def antecedent_moisture(self, moment: datetime) -> float:
        """Exponentially-decayed sum of the preceding whole days' rainfall.

        Saturated ground from earlier in the week is why an otherwise ordinary
        burst floods; the decay weight makes yesterday count more than day-3.
        """
        local = moment.astimezone(IST)
        total = 0.0
        for back in range(1, Config.ANTECEDENT_DAYS + 1):
            total += self.daily(local.date() - timedelta(days=back)) * (
                Config.ANTECEDENT_DECAY ** (back - 1)
            )
        return total


# --------------------------------------------------------------------------
# Calendar features
# --------------------------------------------------------------------------
def monsoon_week(moment: datetime) -> int:
    """1-indexed week inside the monsoon window; 0 outside it."""
    local = moment.astimezone(IST)
    if not (Config.MONSOON_START_MONTH <= local.month <= Config.MONSOON_END_MONTH):
        return 0
    season_start = date(local.year, Config.MONSOON_START_MONTH, 1)
    return ((local.date() - season_start).days // 7) + 1


def is_monsoon(moment: datetime) -> bool:
    return Config.MONSOON_START_MONTH <= moment.astimezone(IST).month <= Config.MONSOON_END_MONTH


# --------------------------------------------------------------------------
# Crowd features (0 for every historical row — there were no reports then)
# --------------------------------------------------------------------------
def crowd_features(cur, spot_id: int, moment: datetime) -> tuple[int, float]:
    """(count, recency-weighted score) of crowd reports near a spot recently."""
    cur.execute(
        """
        SELECT r.reported_at
          FROM crowd_reports r
          JOIN flood_spots s ON s.id = %(spot_id)s
         WHERE ST_DWithin(
                   ST_Transform(r.geom, %(metric)s),
                   ST_Transform(s.geom, %(metric)s),
                   %(radius)s
               )
           AND r.reported_at <= %(moment)s
           AND r.reported_at >  %(moment)s - (%(hours)s * INTERVAL '1 hour')
        """,
        {
            "spot_id": spot_id,
            "metric": Config.METRIC_SRID,
            "radius": Config.CROWD_RADIUS_M,
            "moment": moment,
            "hours": Config.CROWD_WINDOW_HOURS,
        },
    )
    stamps = [row[0] for row in cur.fetchall()]
    weighted = sum(
        math.exp(-((moment - ts).total_seconds() / 3600.0) / Config.CROWD_DECAY_HOURS)
        for ts in stamps
    )
    return len(stamps), round(weighted, 4)


# --------------------------------------------------------------------------
# Snapshot assembly
# --------------------------------------------------------------------------
def build_features(cur, spot: dict, moment: datetime, rainfall: RainfallSeries) -> dict:
    """The full feature vector for one (spot, timestamp). Used at train + serve."""
    crowd_count, crowd_score = crowd_features(cur, spot["id"], moment)
    return {
        "rain_1h": round(rainfall.at_hour(moment), 4),
        "rain_3h": round(rainfall.window(moment, 3), 4),
        "rain_24h": round(rainfall.window(moment, 24), 4),
        "antecedent_moisture": round(rainfall.antecedent_moisture(moment), 4),
        "elevation_m": spot["elevation_m"],
        "depression_depth_m": spot["depression_depth_m"],
        "drain_distance_m": spot["nearest_drain_m"],
        "monsoon_week": monsoon_week(moment),
        "hour_of_day": moment.astimezone(IST).hour,
        "crowd_reports_500m_2h": crowd_count,
        "crowd_weighted_score": crowd_score,
    }


def drain_proximity_cutoff(cur) -> float:
    """Metres below which a spot counts as drain-served.

    A hand-picked metre value would be arbitrary and, at 120 m, would label
    only one of the 32 events drain-related -- too degenerate for the Youden's J
    fit in ml.learn_thresholds.  So unless DRAIN_PROXIMITY_M is set explicitly,
    the cutoff is a percentile of the ward's own nearest_drain_m distribution,
    which splits the spots into drain-served and drain-starved halves.
    """
    if Config.DRAIN_PROXIMITY_M > 0:
        return Config.DRAIN_PROXIMITY_M
    cur.execute(
        "SELECT percentile_cont(%s) WITHIN GROUP (ORDER BY nearest_drain_m) "
        "FROM flood_spots WHERE nearest_drain_m IS NOT NULL",
        (Config.DRAIN_PROXIMITY_PERCENTILE / 100.0,),
    )
    value = cur.fetchone()[0]
    return float(value) if value is not None else 0.0


def load_spots(cur) -> dict[int, dict]:
    cur.execute(
        """
        SELECT id, name, elevation_m, depression_depth_m, nearest_drain_m
          FROM flood_spots ORDER BY id
        """
    )
    return {
        row[0]: {
            "id": row[0],
            "name": row[1],
            "elevation_m": float(row[2]) if row[2] is not None else None,
            "depression_depth_m": float(row[3]) if row[3] is not None else None,
            "nearest_drain_m": float(row[4]) if row[4] is not None else None,
        }
        for row in cur.fetchall()
    }


def _monsoon_timestamps(rainfall: RainfallSeries) -> list[datetime]:
    """Every monsoon-season hour covered by the rainfall record."""
    candidates = []
    for day in sorted(rainfall.series):
        if Config.MONSOON_START_MONTH <= day.month <= Config.MONSOON_END_MONTH:
            for hour in range(24):
                candidates.append(datetime(day.year, day.month, day.day, hour, tzinfo=IST))
    return candidates


def _drain_related(spot: dict, cutoff: float) -> bool:
    """True when the spot sits close enough to a drain that a flood there
    implicates the drain rather than sheer rainfall volume."""
    return spot["nearest_drain_m"] is not None and spot["nearest_drain_m"] <= cutoff


def build(neg_pos_ratio: int | None = None) -> dict:
    """(Re)build feature_snapshots. Idempotent: the table is rewritten."""
    ratio = Config.NEG_POS_RATIO if neg_pos_ratio is None else neg_pos_ratio
    rng = random.Random(Config.RANDOM_SEED)
    rainfall = RainfallSeries.load()

    with cursor() as cur:
        spots = load_spots(cur)
        cutoff = drain_proximity_cutoff(cur)

        cur.execute(
            """
            SELECT spot_id, event_ts
              FROM flood_events
             WHERE spot_id IS NOT NULL
             ORDER BY event_ts
            """
        )
        events = [(row[0], row[1]) for row in cur.fetchall()]

        # Rebuild from scratch so re-running can never leave stale rows behind.
        cur.execute("TRUNCATE feature_snapshots RESTART IDENTITY")

        by_spot: dict[int, list[datetime]] = {}
        for spot_id, event_ts in events:
            by_spot.setdefault(spot_id, []).append(event_ts)

        rows: list[tuple] = []

        # ---- positives: one per real event -------------------------------
        for spot_id, event_ts in events:
            spot = spots[spot_id]
            features = build_features(cur, spot, event_ts, rainfall)
            rows.append((spot_id, event_ts, features, _drain_related(spot, cutoff), 1))

        # ---- negatives: monsoon hours far from any event at that spot ----
        pool = _monsoon_timestamps(rainfall)
        wanted = len(events) * ratio
        spot_ids = sorted(spots)
        attempts = 0
        seen: set[tuple[int, datetime]] = {(s, t) for s, t, _f, _d, _l in rows}

        while len(rows) - len(events) < wanted and attempts < wanted * 200:
            attempts += 1
            spot_id = spot_ids[rng.randrange(len(spot_ids))]
            moment = pool[rng.randrange(len(pool))]
            if (spot_id, moment) in seen:
                continue
            # keep a clear margin from any real flood at this spot
            too_close = any(
                abs((moment - ev).total_seconds()) < Config.NEGATIVE_EXCLUSION_HOURS * 3600
                for ev in by_spot.get(spot_id, [])
            )
            if too_close:
                continue
            seen.add((spot_id, moment))
            spot = spots[spot_id]
            features = build_features(cur, spot, moment, rainfall)
            rows.append((spot_id, moment, features, _drain_related(spot, cutoff), 0))

        for spot_id, moment, features, drain_related, label in rows:
            cur.execute(
                """
                INSERT INTO feature_snapshots (
                    spot_id, snapshot_ts, rain_1h, rain_3h, rain_24h,
                    antecedent_moisture, elevation_m, depression_depth_m,
                    drain_distance_m, monsoon_week, hour_of_day,
                    crowd_reports_500m_2h, crowd_weighted_score,
                    drain_related, flooded
                ) VALUES (
                    %(spot_id)s, %(ts)s, %(rain_1h)s, %(rain_3h)s, %(rain_24h)s,
                    %(antecedent_moisture)s, %(elevation_m)s, %(depression_depth_m)s,
                    %(drain_distance_m)s, %(monsoon_week)s, %(hour_of_day)s,
                    %(crowd_reports_500m_2h)s, %(crowd_weighted_score)s,
                    %(drain_related)s, %(flooded)s
                )
                ON CONFLICT (spot_id, snapshot_ts) DO UPDATE SET
                    rain_1h = EXCLUDED.rain_1h, rain_3h = EXCLUDED.rain_3h,
                    rain_24h = EXCLUDED.rain_24h,
                    antecedent_moisture = EXCLUDED.antecedent_moisture,
                    flooded = EXCLUDED.flooded
                """,
                {
                    "spot_id": spot_id,
                    "ts": moment,
                    "drain_related": drain_related,
                    "flooded": label,
                    **features,
                },
            )

        cur.execute(
            "SELECT COUNT(*), COUNT(*) FILTER (WHERE flooded = 1) FROM feature_snapshots"
        )
        total, positives = cur.fetchone()

    return {
        "total": total,
        "positives": positives,
        "negatives": total - positives,
        "ratio": ratio,
        "drain_cutoff_m": round(cutoff, 1),
    }


def main() -> int:
    result = build()
    print(
        f"feature_snapshots: {result['total']} rows "
        f"({result['positives']} positive / {result['negatives']} negative, "
        f"ratio 1:{result['ratio']})"
    )
    print(f"  drain-related cutoff: {result['drain_cutoff_m']} m")

    if result["total"] < Config.MIN_DATASET_ROWS:
        print(
            f"WARNING: {result['total']} rows is below MIN_DATASET_ROWS "
            f"({Config.MIN_DATASET_ROWS}); rebuilding at NEG_POS_RATIO="
            f"{Config.FALLBACK_NEG_POS_RATIO}"
        )
        result = build(neg_pos_ratio=Config.FALLBACK_NEG_POS_RATIO)
        print(
            f"feature_snapshots: {result['total']} rows "
            f"({result['positives']} positive / {result['negatives']} negative, "
            f"ratio 1:{result['ratio']})"
        )

    if result["positives"] == 0:
        print("ERROR: no positive samples — check ml.label_matching")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
