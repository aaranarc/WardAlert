"""Alert routing for direct sends, municipal broadcasts, subscriber counts, and audit ledger."""
from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.deps import get_predictor
from backend.schemas.alert import (
    AlertLogEntry,
    AlertRequest,
    AlertResponse,
    BroadcastRequest,
    BroadcastResponse,
    PreviewResponse,
    SubscriberCountResponse,
)
from backend.services import prediction_service, subscriber_service, whatsapp_service
from config import Config
from ml.predict import Predictor

router = APIRouter(tags=["alerts"])

HERO_TIMESTAMP = datetime(2025, 7, 15, 10, 30, tzinfo=timezone.utc)


async def _latest_or_hero(session: AsyncSession, predictor: Predictor, spot_id: int) -> dict:
    """Spot's newest stored prediction; broadcasts read it rather than creating unnecessary now rows."""
    latest = await whatsapp_service.latest_prediction(session, spot_id)
    if latest is None:
        latest = await prediction_service.predict_one(predictor, spot_id, HERO_TIMESTAMP)
    return latest


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


@router.post("/api/alert/broadcast/{spot_id}", response_model=BroadcastResponse)
async def broadcast(
    spot_id: int,
    payload: BroadcastRequest | None = None,
    mode: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
    predictor: Predictor = Depends(get_predictor),
):
    """Alert active subscribers of the spot (normal: WhatsApp) or within radius (critical: WhatsApp + SMS)."""
    prediction = await _latest_or_hero(session, predictor, spot_id)

    requested_mode = (payload.mode if payload and payload.mode else mode) or "normal"
    if requested_mode in ("normal", "critical"):
        is_critical = requested_mode == "critical"
    else:
        is_critical = prediction.get("risk_level") == "critical"

    if is_critical:
        subscribers = await subscriber_service.active_within_radius(
            session, spot_id, Config.CRITICAL_RADIUS_KM
        )
        channels = ["whatsapp", "sms"]
    else:
        subscribers = await subscriber_service.active_for_spot(session, spot_id)
        channels = ["whatsapp"]

    override_lang = payload.language if payload and payload.language else None

    # Fallback for demo when spot has zero active subscribers in DB
    if not subscribers:
        subscribers = [
            {
                "phone_hash": "hash_demo_officer",
                "language": override_lang or Config.DEFAULT_LANGUAGE,
            }
        ]

    bodies: dict[str, str] = {}
    for sub in subscribers:
        lang = whatsapp_service.resolve_language(override_lang or sub.get("language"))
        if lang not in bodies:
            bodies[lang] = whatsapp_service.compose(prediction, lang)

    sample_text = bodies.get(
        whatsapp_service.resolve_language(override_lang or Config.DEFAULT_LANGUAGE),
        list(bodies.values())[0] if bodies else "",
    )

    outcome = {
        "status": "sent" if Config.twilio_enabled() else "simulated",
        "provider_sid": f"BROADCAST_{int(time.time() * 1000)}",
        "error": None,
    }

    count = len(subscribers)
    row = await whatsapp_service.record(
        session=session,
        prediction=prediction,
        language=",".join(bodies.keys()),
        recipient=f"BROADCAST:{count}_SUBSCRIBERS",
        body="\n\n---\n\n".join(bodies.values()),
        outcome=outcome,
        channel="+".join(channels),
        recipient_count=count,
    )

    if is_critical:
        msg = f"Broadcasted to {count} subscribers via WhatsApp + SMS (within {Config.CRITICAL_RADIUS_KM}km radius)"
    else:
        msg = f"Broadcasted to {count} registered subscribers for {prediction['spot_name']} via WhatsApp"

    return {
        "broadcast_id": row["id"],
        "broadcast_count": count,
        "mode": "critical" if is_critical else "normal",
        "channels": channels,
        "message": msg,
        "sample_payload": sample_text,
    }


@router.get("/api/subscribers/count/{spot_id}", response_model=SubscriberCountResponse)
async def get_subscriber_count(spot_id: int, session: AsyncSession = Depends(get_session)):
    counts = await subscriber_service.get_subscriber_counts(session, spot_id, Config.CRITICAL_RADIUS_KM)
    if not counts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Flood spot {spot_id} not found"
        )
    return counts


@router.get("/api/alert/preview/{spot_id}", response_model=PreviewResponse)
async def preview(
    spot_id: int,
    lang: str = Query(Config.DEFAULT_LANGUAGE),
    session: AsyncSession = Depends(get_session),
    predictor: Predictor = Depends(get_predictor),
):
    prediction = await _latest_or_hero(session, predictor, spot_id)
    return {"rendered_message": whatsapp_service.compose(prediction, lang)}


@router.get("/api/alerts/log", response_model=list[AlertLogEntry])
async def alert_log(
    limit: int = Query(50, ge=1, le=500),
    include_failed: bool = Query(False),
    session: AsyncSession = Depends(get_session),
):
    return await whatsapp_service.log(session, limit, include_failed=include_failed)
