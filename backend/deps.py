"""FastAPI dependencies.

get_models returns the Predictor built once during the lifespan — loading two
XGBoost models and a SHAP explainer per request would dominate the latency.
"""
from __future__ import annotations

from fastapi import HTTPException, Request, status

from ml.predict import Predictor


def get_predictor(request: Request) -> Predictor:
    predictor = getattr(request.app.state, "predictor", None)
    if predictor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "models are not loaded — run `python -m ml.train_model_a`, "
                "`python -m ml.train_model_b`, then `python -m ml.learn_thresholds`"
            ),
        )
    return predictor
