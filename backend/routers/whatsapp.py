"""POST /api/whatsapp/webhook — the citizen side of WardAlert.

Twilio posts every inbound WhatsApp message here, form-encoded, and relays the
TwiML reply back to the citizen.  The flow is deliberately command-free for the
common case: share a location and you are subscribed to the nearest flood spot
for 7 days, with its current risk as the reply.  STATUS, EXTEND and STOP cover
the rest.
"""
from __future__ import annotations

import re
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Form, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.deps import get_predictor
from backend.services import prediction_service, subscriber_service, whatsapp_service

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

ONBOARDING = "Share your location to check flood risk. Reply STATUS anytime, EXTEND to renew."
NO_SUBSCRIPTION = "No active subscription. Share your location to subscribe."

# Words a citizen might type to pick a reply language, keyed by template
# language code.  A code missing from whatsapp_templates/ is ignored, and the
# bare code "hi" is deliberately not a keyword — it is far more often a greeting.
LANGUAGE_KEYWORDS = {
    "hi": ("hindi", "हिंदी", "हिन्दी"),
    "hinglish": ("hinglish",),
    "mr": ("marathi", "मराठी"),
}


def twiml(msg: str) -> Response:
    return Response(
        f'<?xml version="1.0"?><Response><Message>{escape(msg)}</Message></Response>',
        media_type="application/xml",
    )


def detect_language(body: str) -> str | None:
    words = set(re.findall(r"\w+", body.lower()))
    for language in subscriber_service.template_languages():
        if words & set(LANGUAGE_KEYWORDS.get(language, ())):
            return language
    return None


async def risk_reply(request: Request, spot_id: int, language: str | None) -> Response:
    prediction = await prediction_service.predict_one(get_predictor(request), spot_id, None)
    return twiml(whatsapp_service.compose(prediction, language))


@router.post("/webhook")
async def webhook(
    request: Request,
    From: str = Form(...),
    Body: str | None = Form(None),
    Latitude: float | None = Form(None),
    Longitude: float | None = Form(None),
    session: AsyncSession = Depends(get_session),
):
    phone_hash = subscriber_service.hash_phone(From)
    body = (Body or "").strip().upper()
    language = detect_language(Body or "")

    # A) Location share → subscribe to the nearest spot and reply with its risk.
    if Latitude is not None and Longitude is not None:
        spot = await subscriber_service.nearest_spot(session, Latitude, Longitude)
        language = await subscriber_service.subscribe(session, phone_hash, spot["id"], language)
        return await risk_reply(request, spot["id"], language)

    # B) EXTEND → renew for another 7 days.
    if body == "EXTEND":
        spot_name = await subscriber_service.extend(session, phone_hash)
        if spot_name:
            return twiml(f"Extended 7 days for {spot_name}.")
        return twiml(NO_SUBSCRIPTION)

    # C) STATUS → current risk at the saved spot.
    if body == "STATUS":
        sub = await subscriber_service.active(session, phone_hash)
        if not sub:
            return twiml(NO_SUBSCRIPTION)
        return await risk_reply(request, sub["spot_id"], sub["language"])

    # Every alert template ends "Reply STOP to unsubscribe", so honour it.
    if body == "STOP":
        await subscriber_service.unsubscribe(session, phone_hash)
        return twiml("Unsubscribed. Share your location to subscribe again.")

    if language and await subscriber_service.set_language(session, phone_hash, language):
        return twiml(f"Language set to {language}. {ONBOARDING}")

    # D) Anything else → onboarding.
    return twiml(ONBOARDING)
