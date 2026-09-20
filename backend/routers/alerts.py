"""POST /api/alert/send, POST /api/alert/broadcast/{spot_id} and GET /api/alerts/log.

Sending an alert predicts first, so the message always carries the current
risk rather than whatever was last written to the predictions table.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.deps import get_predictor
from backend.schemas.alert import (
    AlertLogEntry,
    AlertRequest,
    AlertResponse,
    BroadcastResponse,
)
from backend.services import prediction_service, subscriber_service, whatsapp_service
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


from config import Config


@router.post("/api/alert/broadcast/{spot_id}", response_model=BroadcastResponse)
async def broadcast(
    spot_id: int,
    mode: str = Query("normal", regex="^(normal|critical)$"),
    session: AsyncSession = Depends(get_session),
    predictor: Predictor = Depends(get_predictor),
):
    """Alert active subscribers of the spot (normal: WhatsApp) or within radius (critical: WhatsApp + SMS)."""
    prediction = await prediction_service.predict_one(predictor, spot_id, None)
    outcome = {"status": "simulated", "provider_sid": None, "error": None}

    if mode == "critical":
        subscribers = await subscriber_service.active_within_radius(
            session, spot_id, Config.CRITICAL_RADIUS_KM
        )
        channels = ["whatsapp", "sms"]
    else:
        subscribers = await subscriber_service.active_for_spot(session, spot_id)
        channels = ["whatsapp"]

    bodies: dict[str, str] = {}
    count = 0
    for sub in subscribers:
        language = whatsapp_service.resolve_language(sub["language"])
        if language not in bodies:
            bodies[language] = whatsapp_service.compose(prediction, language)
        for ch in channels:
            await whatsapp_service.record(
                session,
                prediction,
                language,
                sub["phone_hash"],
                bodies[language],
                outcome,
                channel=ch,
            )
        count += 1

    if mode == "critical":
        msg = f"Broadcasted to {count} subscribers via WhatsApp + SMS (within {Config.CRITICAL_RADIUS_KM}km radius)"
    else:
        msg = f"Broadcasted to {count} subscribers via WhatsApp"

    return {
        "broadcast_count": count,
        "mode": mode,
        "channels": channels,
        "message": msg,
    }


@router.get("/api/alerts/log", response_model=list[AlertLogEntry])
async def alert_log(
    limit: int = Query(50, ge=1, le=500),
    include_failed: bool = Query(False),
    session: AsyncSession = Depends(get_session),
):
    return await whatsapp_service.log(session, limit, include_failed=include_failed)
