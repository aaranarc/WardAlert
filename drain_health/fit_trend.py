"""Fit a linear Δ trend per spot across its weekly history.

A spot needs at least Config.DRAIN_HEALTH_MIN_WEEKS weeks before a slope means
anything; below that the trend columns stay NULL rather than carrying a number
fitted on two points.
"""
from __future__ import annotations

import numpy as np

from config import Config
from data_loader.db import cursor


def _absolute_week(year: int, week: int, base_year: int) -> float:
    """Weeks are fitted on a continuous axis so years join up correctly."""
    return (year - base_year) * 52.0 + week


def fit() -> dict:
    with cursor() as cur:
        cur.execute(
            """
            SELECT spot_id, year, week_number, avg_delta
              FROM drain_health_weekly
             ORDER BY spot_id, year, week_number
            """
        )
        rows = cur.fetchall()

        by_spot: dict[int, list[tuple[int, int, float]]] = {}
        for spot_id, year, week, avg_delta in rows:
            by_spot.setdefault(spot_id, []).append((year, week, float(avg_delta)))

        if not rows:
            return {"fitted": 0, "skipped": 0}

        base_year = min(year for _s, year, _w, _d in rows)
        fitted = skipped = 0

        for spot_id, series in by_spot.items():
            if len(series) < Config.DRAIN_HEALTH_MIN_WEEKS:
                skipped += 1
                continue
            weeks = np.array([_absolute_week(y, w, base_year) for y, w, _d in series])
            deltas = np.array([d for _y, _w, d in series])
            slope, intercept = np.polyfit(weeks, deltas, 1)
            cur.execute(
                """
                UPDATE drain_health_weekly
                   SET trend_slope = %s, trend_intercept = %s, updated_at = now()
                 WHERE spot_id = %s
                """,
                (float(slope), float(intercept), spot_id),
            )
            fitted += 1

    return {"fitted": fitted, "skipped": skipped, "base_year": base_year}


if __name__ == "__main__":
    print(f"trend fit: {fit()}")
