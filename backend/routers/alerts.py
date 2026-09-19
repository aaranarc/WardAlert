"""POST /api/alert/send and GET /api/alerts/log.

Sending an alert predicts first, so the message always carries the current
risk rather than whatever was last written to the predictions table.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.deps import get_predictor
from backend.schemas.alert import AlertLogEntry, AlertRequest, AlertResponse
from backend.services import prediction_service, whatsapp_service
from ml.predict import Predictor

router = APIRouter(tags=["alerts"])


@router.post("/api/alert/send", response_model=AlertResponse)
async def send_alert(
    payload: AlertRequest,
    session: AsyncSession = Depends(get_session),
    predictor: Predictor = Depends(get_predictor),
):
    prediction = await prediction_service.predict_one(predictor, payload.spot_id, None)
    return await whatsapp_service.send_alert(
        session, prediction, payload.language, payload.recipient
    )


@router.get("/api/alerts/log", response_model=list[AlertLogEntry])
async def alert_log(
    limit: int = Query(50, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    return await whatsapp_service.log(session, limit)
