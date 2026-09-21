"""Turn each spot's Δ trend into a maintenance date and a health score.

    solve  trend_slope * week + trend_intercept = critical_delta

`critical_delta` is the learned p90 of observed Δ (ml/models/thresholds.json),
so "failure" means this drain is heading for the worst tenth of residuals the
ward has actually seen — not an invented number.

A spot whose Δ is flat or falling has no failure date: extrapolating one would
be fiction, so the column stays NULL and only health_score is reported.
"""
from __future__ import annotations

from datetime import date, timedelta

from config import Config
from data_loader.db import cursor

# Do not forecast further out than this; a linear fit on weekly Δ says nothing
# useful a decade ahead.
MAX_FORECAST_WEEKS = 520
# How far back a crossing date may sit. A spot whose Δ passed critical inside
# the observed record is genuinely overdue for desilting and the date is real;
# anything older than the record itself is extrapolation and is dropped.
MAX_BACKCAST_WEEKS = 520


def _week_to_date(absolute_week: float, base_year: int) -> date | None:
    """Map the fitted week axis back onto the calendar (may be in the past)."""
    try:
        return date(base_year, 1, 1) + timedelta(weeks=float(absolute_week))
    except (OverflowError, ValueError):
        return None


def compute() -> dict:
    critical_delta = Config.DRAIN_CRITICAL_DELTA

    with cursor() as cur:
        cur.execute("SELECT MIN(year) FROM drain_health_weekly")
        base_row = cur.fetchone()
        if not base_row or base_row[0] is None:
            return {"scored": 0, "dated": 0, "overdue": 0, "critical_delta": critical_delta}
        base_year = int(base_row[0])

        cur.execute(
            """
            SELECT id, spot_id, year, week_number, avg_delta,
                   trend_slope, trend_intercept
              FROM drain_health_weekly
             ORDER BY spot_id, year, week_number
            """
        )
        rows = cur.fetchall()

        scored = dated = overdue = 0
        for row_id, _spot_id, _year, _week, avg_delta, slope, intercept in rows:
            # health_score: 100 when Δ is zero, 0 once Δ reaches the critical
            # level. Clipped so a spot already past critical reads 0, not negative.
            if critical_delta > 0:
                score = 100.0 * (1.0 - float(avg_delta) / critical_delta)
            else:
                score = 100.0
            score = max(0.0, min(100.0, score))

            # Solve the fitted line for the week Δ crosses critical. The
            # crossing may already be in the past: most G/South spots sit above
            # critical Δ today, and reporting NULL for them would hide the very
            # drains most in need of desilting. A past date reads as "overdue",
            # a future one as "schedule by". Only a flat or improving trend
            # (slope <= 0) genuinely has no crossing.
            failure_date = None
            if slope is not None and intercept is not None and float(slope) > 0:
                crossing_week = (critical_delta - float(intercept)) / float(slope)
                if -MAX_BACKCAST_WEEKS <= crossing_week <= MAX_FORECAST_WEEKS:
                    failure_date = _week_to_date(crossing_week, base_year)

            cur.execute(
                """
                UPDATE drain_health_weekly
                   SET health_score = %s,
                       predicted_failure_date = %s,
                       updated_at = now()
                 WHERE id = %s
                """,
                (round(score, 2), failure_date, row_id),
            )
            scored += 1
            if failure_date is not None:
                dated += 1
                if failure_date <= date.today():
                    overdue += 1

    return {
        "scored": scored,
        "dated": dated,
        "overdue": overdue,
        "critical_delta": critical_delta,
    }


if __name__ == "__main__":
    print(f"failure dates: {compute()}")
