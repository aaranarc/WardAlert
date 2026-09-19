"""Shared loading and splitting of feature_snapshots for both models.

Model A and Model B must see the *same* train/test partition, otherwise the
Δ = P_actual − P_rain residual that the whole system rests on would be
comparing probabilities fitted on different data.  Both therefore split with
the same stratification and the same Config.RANDOM_SEED.
"""
from __future__ import annotations

import pandas as pd
from sklearn.model_selection import train_test_split

from config import Config
from data_loader.db import cursor

TARGET = "flooded"


def load_frame() -> pd.DataFrame:
    with cursor() as cur:
        cur.execute(
            """
            SELECT id, spot_id, snapshot_ts, rain_1h, rain_3h, rain_24h,
                   antecedent_moisture, elevation_m, depression_depth_m,
                   drain_distance_m, monsoon_week, hour_of_day,
                   crowd_reports_500m_2h, crowd_weighted_score,
                   drain_related, flooded
              FROM feature_snapshots
             ORDER BY id
            """
        )
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
    frame = pd.DataFrame(rows, columns=columns)
    numeric = [c for c in columns if c not in ("snapshot_ts", "drain_related")]
    frame[numeric] = frame[numeric].astype(float)
    return frame


def split(frame: pd.DataFrame):
    """Stratified train/test split shared by both models."""
    return train_test_split(
        frame,
        test_size=Config.TEST_SIZE,
        random_state=Config.RANDOM_SEED,
        stratify=frame[TARGET],
    )
