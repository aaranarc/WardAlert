"""Aggregate the scheduled monsoon replay predictions into weekly Δ per spot.

Only rows at the exact timestamps drain_health.main replays are counted. One-off
predictions (dashboard clicks, alert tests, ad-hoc replays at other dates) land
in the same table, and folding them in flattened every spot's trend.
"""
from __future__ import annotations

from data_loader.db import cursor


def compute() -> int:
    """Rebuild one row per (spot, ISO year, ISO week). Returns rows written."""
    # Imported here: drain_health.main imports this module.
    from drain_health.main import monsoon_weeks

    with cursor() as cur:
        # Derived table, rebuilt in full so weeks that only one-off rows filled
        # do not linger from an earlier run.
        cur.execute("DELETE FROM drain_health_weekly")
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
             WHERE predicted_for = ANY(%s)
             GROUP BY spot_id,
                      EXTRACT(ISOYEAR FROM predicted_for),
                      EXTRACT(WEEK    FROM predicted_for)
            ON CONFLICT (spot_id, year, week_number) DO UPDATE SET
                week_start       = EXCLUDED.week_start,
                avg_delta        = EXCLUDED.avg_delta,
                max_delta        = EXCLUDED.max_delta,
                prediction_count = EXCLUDED.prediction_count,
                updated_at       = now()
            """,
            (monsoon_weeks(),),
        )
        return cur.rowcount


if __name__ == "__main__":
    print(f"drain_health_weekly: {compute()} row(s) upserted")
