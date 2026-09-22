"""End-to-end inference: spot + timestamp -> the full decision payload.

This is the single path both the API and the drain-health bootstrap use, so a
number shown on the dashboard and a number behind a failure-date forecast can
never diverge.  Models and thresholds are loaded once and cached.

    python -m ml.predict 1
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

import joblib
import pandas as pd

from config import Config
from data_loader.db import cursor
from ml.confidence import credible_interval
from ml.feature_engineering import RainfallSeries, build_features, load_spots
from ml.learn_thresholds import classify_cause, classify_risk, load_thresholds
from ml.shap_explainer import ShapExplainer


class Predictor:
    """Loaded-once bundle of both models, thresholds, and the SHAP explainer."""

    def __init__(self):
        self.model_a = joblib.load(Config.model_path("a"))
        self.model_b = joblib.load(Config.model_path("b"))
        self.thresholds = load_thresholds()
        columns = json.loads(Config.feature_columns_path().read_text())
        self.features_a = columns["model_a"]
        self.features_b = columns["model_b"]
        self.explainer = ShapExplainer(self.model_b, self.features_b)
        self._rainfall: RainfallSeries | None = None

    @property
    def rainfall(self) -> RainfallSeries:
        if self._rainfall is None:
            self._rainfall = RainfallSeries.load()
        return self._rainfall

    def refresh_rainfall(self) -> None:
        self._rainfall = None

    def predict_one(
        self,
        spot_id: int,
        moment: datetime | None = None,
        cur=None,
        persist: bool = True,
    ) -> dict:
        """Predict for one spot. Pass `cur` to batch many under one transaction."""
        if cur is None:
            with cursor() as own_cursor:
                return self._predict(spot_id, moment, own_cursor, persist)
        return self._predict(spot_id, moment, cur, persist)

    def _predict(self, spot_id: int, moment: datetime | None, cur, persist: bool) -> dict:
        moment = moment or Config.HERO_TIMESTAMP
        spots = load_spots(cur)
        if spot_id not in spots:
            raise KeyError(f"unknown spot_id {spot_id}")
        spot = spots[spot_id]

        features = build_features(cur, spot, moment, self.rainfall)
        frame = pd.DataFrame([features])

        p_rain = float(self.model_a.predict_proba(frame[self.features_a])[:, 1][0])
        p_actual = float(self.model_b.predict_proba(frame[self.features_b])[:, 1][0])
        delta = p_actual - p_rain

        risk_level = classify_risk(p_actual, self.thresholds)
        cause_label, dispatch_type = classify_cause(delta, self.thresholds)
        lower, upper = credible_interval(p_actual)
        shap_top3 = self.explainer.top_features(frame[self.features_b], k=3)

        result = {
            "spot_id": spot_id,
            "spot_name": spot["name"],
            "predicted_for": moment,
            "p_rain": round(p_rain, 6),
            "p_actual": round(p_actual, 6),
            "delta": round(delta, 6),
            "risk_level": risk_level,
            "cause_label": cause_label,
            "dispatch_type": dispatch_type,
            "confidence_lower": lower,
            "confidence_upper": upper,
            "shap_top3": shap_top3,
            "features": features,
        }

        if persist:
            self._persist(cur, result)
        return result

    @staticmethod
    def _persist(cur, result: dict) -> None:
        cur.execute(
            """
            INSERT INTO predictions (
                spot_id, predicted_for, p_rain, p_actual, delta, risk_level,
                cause_label, dispatch_type, confidence_lower, confidence_upper,
                shap_top3, features
            ) VALUES (
                %(spot_id)s, %(predicted_for)s, %(p_rain)s, %(p_actual)s, %(delta)s,
                %(risk_level)s, %(cause_label)s, %(dispatch_type)s,
                %(confidence_lower)s, %(confidence_upper)s,
                %(shap_top3)s::jsonb, %(features)s::jsonb
            )
            ON CONFLICT (spot_id, predicted_for) DO UPDATE SET
                p_rain = EXCLUDED.p_rain, p_actual = EXCLUDED.p_actual,
                delta = EXCLUDED.delta, risk_level = EXCLUDED.risk_level,
                cause_label = EXCLUDED.cause_label,
                dispatch_type = EXCLUDED.dispatch_type,
                confidence_lower = EXCLUDED.confidence_lower,
                confidence_upper = EXCLUDED.confidence_upper,
                shap_top3 = EXCLUDED.shap_top3, features = EXCLUDED.features,
                created_at = now()
            RETURNING id
            """,
            {
                **{k: result[k] for k in (
                    "spot_id", "predicted_for", "p_rain", "p_actual", "delta",
                    "risk_level", "cause_label", "dispatch_type",
                    "confidence_lower", "confidence_upper",
                )},
                "shap_top3": json.dumps(result["shap_top3"]),
                "features": json.dumps(result["features"]),
            },
        )
        row = cur.fetchone()
        if row:
            result["prediction_id"] = row[0]

    def predict_all(self, moment: datetime | None = None, persist: bool = True) -> list[dict]:
        moment = moment or Config.HERO_TIMESTAMP
        with cursor() as cur:
            spot_ids = sorted(load_spots(cur))
            return [self.predict_one(sid, moment, cur=cur, persist=persist) for sid in spot_ids]


_PREDICTOR: Predictor | None = None


def get_predictor() -> Predictor:
    """Process-wide singleton, so the models load once."""
    global _PREDICTOR
    if _PREDICTOR is None:
        _PREDICTOR = Predictor()
    return _PREDICTOR


def predict_one(spot_id: int, moment: datetime | None = None, **kwargs) -> dict:
    return get_predictor().predict_one(spot_id, moment, **kwargs)


if __name__ == "__main__":
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    output = predict_one(target)
    output["predicted_for"] = output["predicted_for"].isoformat()
    print(json.dumps(output, indent=2))
