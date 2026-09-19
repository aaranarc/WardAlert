"""Reads drain_health_weekly into the leaderboard and per-spot trend views.

The weekly table holds one row per (spot, year, week); the leaderboard needs
one row per spot, so the aggregation happens here rather than being stored
twice.  Sorting is by health_score ascending — the worst drain first, because
that is the one a desilting crew should be sent to.
"""
from __future__ import annotations

from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Positive-but-tiny slopes are noise, not degradation. A drain must be gaining
# at least this much Δ per week before it is called degrading.
SLOPE_EPSILON = 1e-5

LEADERBOARD_SQL = """
SELECT w.spot_id,
       s.name, s.lat, s.lng,
       AVG(w.health_score)        AS health_score,
       AVG(w.avg_delta)           AS avg_delta,
       MAX(w.max_delta)           AS max_delta,
       COUNT(*)                   AS weeks_tracked,
       SUM(w.prediction_count)    AS prediction_count,
       MAX(w.trend_slope)         AS trend_slope,
       MIN(w.predicted_failure_date) AS predicted_failure_date
  FROM drain_health_weekly w
  JOIN flood_spots s ON s.id = w.spot_id
 GROUP BY w.spot_id, s.name, s.lat, s.lng
 ORDER BY AVG(w.health_score) ASC
"""


def classify_status(slope: float | None, failure_date: date | None) -> str:
    """Plain-language state for the leaderboard chip."""
    if failure_date is not None and failure_date <= date.today():
        return "overdue"
    if slope is None:
        return "stable"
    if slope > SLOPE_EPSILON:
        return "degrading"
    if slope < -SLOPE_EPSILON:
        return "improving"
    return "stable"


async def leaderboard(session: AsyncSession, limit: int | None = None) -> list[dict]:
    result = await session.execute(text(LEADERBOARD_SQL))
    rows = [dict(row) for row in result.mappings()]
    for row in rows:
        row["health_score"] = round(float(row["health_score"]), 2)
        row["avg_delta"] = round(float(row["avg_delta"]), 6)
        row["max_delta"] = round(float(row["max_delta"]), 6)
        row["weeks_tracked"] = int(row["weeks_tracked"])
        row["prediction_count"] = int(row["prediction_count"])
        row["status"] = classify_status(row["trend_slope"], row["predicted_failure_date"])
    return rows[:limit] if limit else rows


async def detail(session: AsyncSession, spot_id: int, critical_delta: float) -> dict | None:
    summary = await session.execute(
        text(LEADERBOARD_SQL.replace("GROUP BY", "WHERE w.spot_id = :spot_id GROUP BY")),
        {"spot_id": spot_id},
    )
    row = summary.mappings().first()
    if row is None:
        return None
    row = dict(row)

    weekly_result = await session.execute(
        text(
            """
            SELECT year, week_number, week_start, avg_delta, max_delta,
                   prediction_count, health_score, trend_intercept
              FROM drain_health_weekly
             WHERE spot_id = :spot_id
             ORDER BY year, week_number
            """
        ),
        {"spot_id": spot_id},
    )
    weekly = [dict(point) for point in weekly_result.mappings()]

    return {
        "spot_id": row["spot_id"],
        "name": row["name"],
        "lat": row["lat"],
        "lng": row["lng"],
        "health_score": round(float(row["health_score"]), 2),
        "avg_delta": round(float(row["avg_delta"]), 6),
        "max_delta": round(float(row["max_delta"]), 6),
        "weeks_tracked": int(row["weeks_tracked"]),
        "trend_slope": row["trend_slope"],
        "trend_intercept": weekly[0]["trend_intercept"] if weekly else None,
        "predicted_failure_date": row["predicted_failure_date"],
        "critical_delta": critical_delta,
        "status": classify_status(row["trend_slope"], row["predicted_failure_date"]),
        "weekly": weekly,
    }
