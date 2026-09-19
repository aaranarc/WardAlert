"""POST /api/predict and /api/predict/all — run the dual model on demand.

Every prediction served is also written to the predictions table, which is what
feeds v_latest_risk on the map and the weekly Δ series behind drain health.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.deps import get_predictor
from backend.schemas.prediction import (
    PredictAllRequest,
    PredictionResponse,
    PredictRequest,
)
from backend.services import prediction_service
from ml.predict import Predictor

router = APIRouter(prefix="/api/predict", tags=["predict"])


@router.post("", response_model=PredictionResponse)
async def predict(payload: PredictRequest, predictor: Predictor = Depends(get_predictor)):
    return await prediction_service.predict_one(predictor, payload.spot_id, payload.timestamp)


@router.post("/all", response_model=list[PredictionResponse])
async def predict_all(
    payload: PredictAllRequest | None = None,
    predictor: Predictor = Depends(get_predictor),
):
    moment = payload.timestamp if payload else None
    return await prediction_service.predict_all(predictor, moment)
