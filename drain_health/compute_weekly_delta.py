"""Aggregate the predictions table into weekly Δ per spot."""
from __future__ import annotations

from data_loader.db import cursor


def compute() -> int:
    """UPSERT one row per (spot, ISO year, ISO week). Returns rows written."""
    with cursor() as cur:
        cur.execute(
            """
            INSERT INTO drain_health_weekly (
                spot_id, year, week_number, week_start,
                avg_delta, max_delta, prediction_count, updated_at
            )
            SELECT spot_id,
                   EXTRACT(ISOYEAR FROM predicted_for)::int AS year,
                   EXTRACT(WEEK    FROM predicted_for)::int AS week_number,
                   MIN(predicted_for)::date                 AS week_start,
                   AVG(delta)                               AS avg_delta,
                   MAX(delta)                               AS max_delta,
                   COUNT(*)                                 AS prediction_count,
                   now()
              FROM predictions
             GROUP BY spot_id,
                      EXTRACT(ISOYEAR FROM predicted_for),
                      EXTRACT(WEEK    FROM predicted_for)
            ON CONFLICT (spot_id, year, week_number) DO UPDATE SET
                week_start       = EXCLUDED.week_start,
                avg_delta        = EXCLUDED.avg_delta,
                max_delta        = EXCLUDED.max_delta,
                prediction_count = EXCLUDED.prediction_count,
                updated_at       = now()
            """
        )
        return cur.rowcount


if __name__ == "__main__":
    print(f"drain_health_weekly: {compute()} row(s) upserted")
