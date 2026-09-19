"""Bootstrap historical predictions, then build the drain health index.

Drain health is a trend over weekly Δ, so it needs a prediction history before
it can compute anything.  The predictions table starts empty, so step 1 replays
every monsoon week of BOOTSTRAP_YEARS through ml.predict — the same inference
path the API serves — and only then aggregates.

    python -m drain_health.main

Idempotent: predictions upsert on (spot_id, predicted_for) and the weekly table
upserts on (spot_id, year, week_number).
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timedelta, timezone

from config import Config
from data_loader.db import cursor, wait_for_db
from drain_health import compute_weekly_delta, fit_trend, predict_failure_date
from ml import learn_thresholds
from ml.feature_engineering import IST
from ml.predict import get_predictor


def monsoon_weeks() -> list[datetime]:
    """Bootstrap timestamps across every monsoon week of BOOTSTRAP_YEARS.

    Each week is probed at BOOTSTRAP_SAMPLES_PER_WEEK evenly spaced days so the
    weekly aggregation has something real to average over; a single sample per
    week would make avg_delta, max_delta and prediction_count meaningless.
    """
    stamps: list[datetime] = []
    step_days = max(7 // max(Config.BOOTSTRAP_SAMPLES_PER_WEEK, 1), 1)

    for year in Config.BOOTSTRAP_YEARS:
        week_start = date(year, Config.MONSOON_START_MONTH, 1)
        # advance to the first Monday so weeks line up with ISO week numbers
        week_start += timedelta(days=(7 - week_start.weekday()) % 7)
        while week_start.month <= Config.MONSOON_END_MONTH:
            for sample in range(Config.BOOTSTRAP_SAMPLES_PER_WEEK):
                day = week_start + timedelta(days=sample * step_days)
                if day.month > Config.MONSOON_END_MONTH or day.year != year:
                    break
                stamps.append(
                    datetime(
                        day.year, day.month, day.day,
                        Config.BOOTSTRAP_HOUR, tzinfo=IST,
                    ).astimezone(timezone.utc)
                )
            week_start += timedelta(weeks=1)
    return stamps


def bootstrap_predictions() -> int:
    """Replay every spot × monsoon week through the real inference path."""
    predictor = get_predictor()
    stamps = monsoon_weeks()

    with cursor() as cur:
        cur.execute("SELECT id FROM flood_spots ORDER BY id")
        spot_ids = [row[0] for row in cur.fetchall()]

        written = 0
        for moment in stamps:
            for spot_id in spot_ids:
                predictor.predict_one(spot_id, moment, cur=cur, persist=True)
                written += 1
    return written


def main() -> int:
    print("WardAlert drain health")
    wait_for_db()

    years = ", ".join(str(y) for y in Config.BOOTSTRAP_YEARS)
    stamps = monsoon_weeks()
    print(f"\n1. bootstrapping predictions across monsoon {years}")
    print(f"   {len(stamps)} timestamps "
          f"({Config.BOOTSTRAP_SAMPLES_PER_WEEK}/week) x 30 spots")
    written = bootstrap_predictions()
    print(f"   {written} predictions written")

    # critical_delta is a percentile of Δ, so it has to be measured over the
    # population it is applied to. Before this step that population did not
    # exist, and the cold-start value (p90 of the 48-row test set) marked every
    # spot overdue. Re-learning here closes that loop and keeps a cold clone
    # reproducible in one command.
    print("\n2. recalibrating thresholds on the prediction population")
    thresholds = learn_thresholds.learn()
    print(f"   critical_delta = {thresholds['critical_delta']:.4f} "
          f"(p{thresholds['critical_delta_percentile']:.0f} of Δ over "
          f"{thresholds['critical_delta_n']} rows from "
          f"{thresholds['critical_delta_source']})")
    get_predictor().thresholds = thresholds

    print("\n3. weekly Δ aggregation")
    weekly = compute_weekly_delta.compute()
    print(f"   {weekly} drain_health_weekly rows")

    print("\n4. trend fit (min "
          f"{Config.DRAIN_HEALTH_MIN_WEEKS} weeks per spot)")
    trend = fit_trend.fit()
    print(f"   {trend['fitted']} spots fitted, {trend['skipped']} skipped")

    print("\n5. failure dates + health scores")
    failure = predict_failure_date.compute()
    print(f"   critical_delta = {failure['critical_delta']:.4f}")
    print(f"   {failure['scored']} rows scored, {failure['dated']} with a crossing date "
          f"({failure['overdue']} already overdue)")

    with cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM predictions")
        predictions = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM drain_health_weekly")
        weekly_rows = cur.fetchone()[0]
        cur.execute(
            """
            SELECT s.name,
                   ROUND(AVG(w.health_score)::numeric, 1),
                   ROUND(AVG(w.avg_delta)::numeric, 4),
                   MAX(w.trend_slope)
              FROM drain_health_weekly w
              JOIN flood_spots s ON s.id = w.spot_id
             GROUP BY s.name
             ORDER BY AVG(w.health_score) ASC
             LIMIT 5
            """
        )
        worst = cur.fetchall()

    print(f"\npredictions          {predictions}")
    print(f"drain_health_weekly  {weekly_rows}")
    print("\nworst 5 spots by health score")
    for name, score, avg_delta, slope in worst:
        slope_text = f"{slope:+.5f}/wk" if slope is not None else "  n/a   "
        print(f"  {name:<32} score {score:>5}  avgΔ {avg_delta:>8}  trend {slope_text}")

    return 0 if weekly_rows > 100 else 1


if __name__ == "__main__":
    sys.exit(main())
