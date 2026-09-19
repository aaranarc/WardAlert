"""Per-prediction explanations via SHAP TreeExplainer on Model B.

A risk score a ward officer cannot interrogate will not be acted on, so every
prediction ships the three features that moved it most, each with the direction
it pushed.  TreeExplainer is exact for XGBoost and fast enough to run inline on
a single row.
"""
from __future__ import annotations

import shap

# Human-readable names for the API payload; the raw column name is kept too.
FEATURE_LABELS = {
    "rain_1h": "rainfall in the last hour",
    "rain_3h": "rainfall in the last 3 hours",
    "rain_24h": "rainfall in the last 24 hours",
    "antecedent_moisture": "ground already saturated",
    "elevation_m": "elevation",
    "depression_depth_m": "depth of local depression",
    "drain_distance_m": "distance to nearest drain",
    "monsoon_week": "week of monsoon",
    "hour_of_day": "hour of day",
    "crowd_reports_500m_2h": "nearby citizen reports",
}


class ShapExplainer:
    """Wraps a TreeExplainer, built once and reused across requests."""

    def __init__(self, model, feature_names: list[str]):
        self.feature_names = feature_names
        self.explainer = shap.TreeExplainer(model)

    def top_features(self, row, k: int = 3) -> list[dict]:
        """The k features with the largest |SHAP| for this single row.

        `row` is a 1-row DataFrame whose columns are already in model order.
        """
        values = self.explainer.shap_values(row)
        # XGBoost binary returns (1, n_features); index into the single row.
        contributions = values[0] if hasattr(values, "shape") and values.ndim > 1 else values

        ranked = sorted(
            zip(self.feature_names, contributions, row.iloc[0].tolist()),
            key=lambda item: abs(float(item[1])),
            reverse=True,
        )[:k]

        return [
            {
                "feature": name,
                "label": FEATURE_LABELS.get(name, name),
                "value": round(float(value), 4),
                "shap_value": round(float(contribution), 6),
                "direction": "increases_risk" if float(contribution) > 0 else "decreases_risk",
            }
            for name, contribution, value in ranked
        ]
