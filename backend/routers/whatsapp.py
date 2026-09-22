"""POST /api/whatsapp/webhook — the citizen side of WardAlert.

Twilio posts every inbound WhatsApp message here (form-encoded), and the
frontend simulator can post JSON.  The endpoint supports both transparently.

Flow:
1. Location Share: Subscribes phone_hash to nearest spot for 7 days, returns live risk alert.
2. STATUS: Returns current dual-model risk and cause attribution for subscriber's spot.
3. EXTEND: Renews active subscription for another 7 days.
4. STOP: Immediately unregisters citizen and removes phone_hash.
5. Language Keywords: Hindi, Marathi, Hinglish, English preference updates.
"""
from __future__ import annotations

import logging
import re
import time
from typing import Any
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.deps import get_predictor
from backend.schemas.alert import WebhookResponse
from backend.services import prediction_service, subscriber_service, whatsapp_service
from config import Config
from ml.predict import Predictor

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])
logger = logging.getLogger("wardalert.whatsapp_webhook")

ONBOARDING_MSG = (
    "👋 Welcome to BMC WardAlert (Ward G-South).\n\n"
    "📍 Share your location pin to subscribe to real-time flood alerts for your nearest chronic waterlogging spot.\n\n"
    "Reply STATUS for live risk, EXTEND to renew 7 days, or STOP to unsubscribe."
)
NO_SUBSCRIPTION_MSG = (
    "You do not have an active subscription. Share your location pin to subscribe to your nearest flood spot."
)

LANGUAGE_KEYWORDS = {
    "hi": ("hindi", "हिंदी", "हिन्दी"),
    "hinglish": ("hinglish",),
    "mr": ("marathi", "मराठी"),
    "en": ("english",),
}

LANGUAGE_CONFIRMATIONS = {
    "hi": "भाषा हिंदी पर सेट कर दी गई है। आपको सभी बाढ़ अलर्ट अब हिंदी में मिलेंगे।",
    "mr": "भाषा मराठी सेट केली आहे. आपल्याला सर्व पूर सूचना आता मराठीत मिळतील.",
    "hinglish": "Language Hinglish set ho gayi hai. Ab alerts Hinglish mein aayenge.",
    "en": "Language set to English. You will receive all flood advisories in English.",
}


def build_twiml(msg: str) -> str:
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escape(msg)}</Message></Response>'


def detect_language(body: str) -> str | None:
    words = set(re.findall(r"[\w\u0900-\u097F]+", body.lower()))
    for lang, keywords in LANGUAGE_KEYWORDS.items():
        if words & set(keywords):
            return lang
    return None


@router.post("/webhook", response_model=WebhookResponse)
async def webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
    predictor: Predictor = Depends(get_predictor),
):
    content_type = request.headers.get("content-type", "").lower()
    is_form = "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type

    from_number = ""
    body_text = ""
    latitude: float | None = None
    longitude: float | None = None

    if is_form:
        form_data = await request.form()
        from_number = str(form_data.get("From") or form_data.get("from") or "+919876543210")
        body_text = str(form_data.get("Body") or form_data.get("body") or "").strip()
        lat_val = form_data.get("Latitude") or form_data.get("latitude")
        lng_val = form_data.get("Longitude") or form_data.get("longitude")
        if lat_val is not None and str(lat_val).strip():
            try:
                latitude = float(str(lat_val))
            except ValueError:
                pass
        if lng_val is not None and str(lng_val).strip():
            try:
                longitude = float(str(lng_val))
            except ValueError:
                pass
    else:
        try:
            json_data = await request.json()
        except Exception:
            json_data = {}
        from_number = str(json_data.get("From") or json_data.get("from") or "+919876543210")
        body_text = str(json_data.get("Body") or json_data.get("body") or "").strip()
        lat_val = json_data.get("Latitude") if "Latitude" in json_data else json_data.get("latitude")
        lng_val = json_data.get("Longitude") if "Longitude" in json_data else json_data.get("longitude")
        if lat_val is not None:
            try:
                latitude = float(lat_val)
            except (ValueError, TypeError):
                pass
        if lng_val is not None:
            try:
                longitude = float(lng_val)
            except (ValueError, TypeError):
                pass

    phone_hash = subscriber_service.hash_phone(from_number)
    upper_body = body_text.upper()
    lang_choice = detect_language(body_text)

    # ------------------------------------------------------------------------
    # Flow A: Location Pin (One-Click Onboarding & Instant Risk Alert)
    # ------------------------------------------------------------------------
    if latitude is not None and longitude is not None:
        spot = await subscriber_service.nearest_spot(session, latitude, longitude)
        pref_lang = lang_choice or Config.DEFAULT_LANGUAGE
        subscribed_lang = await subscriber_service.subscribe(
            session, phone_hash, spot["id"], pref_lang
        )

        prediction = await prediction_service.predict_one(predictor, spot["id"], None)
        alert_msg = whatsapp_service.compose(prediction, subscribed_lang)

        # Audit log delivery
        outcome = {
            "status": "sent" if Config.twilio_enabled() else "simulated",
            "provider_sid": f"WX_{int(time.time() * 1000)}",
            "error": None,
        }
        await whatsapp_service.record(
            session=session,
            prediction=prediction,
            language=subscribed_lang,
            recipient=from_number,
            body=alert_msg,
            outcome=outcome,
            channel="whatsapp",
            recipient_count=1,
        )

        twiml_str = build_twiml(alert_msg)
        if is_form:
            return Response(content=twiml_str, media_type="application/xml")
        return {
            "success": True,
            "action": "subscribed_by_location",
            "spot": spot,
            "distance_m": round(spot.get("distance_m", 0.0), 1) if spot.get("distance_m") is not None else None,
            "reply_message": alert_msg,
            "twiml": twiml_str,
        }

    # ------------------------------------------------------------------------
    # Flow B: Language Preference Change
    # ------------------------------------------------------------------------
    if lang_choice:
        await subscriber_service.set_language(session, phone_hash, lang_choice)
        reply = LANGUAGE_CONFIRMATIONS.get(lang_choice, LANGUAGE_CONFIRMATIONS["en"])
        twiml_str = build_twiml(reply)
        if is_form:
            return Response(content=twiml_str, media_type="application/xml")
        return {
            "success": True,
            "action": "language_set",
            "reply_message": reply,
            "twiml": twiml_str,
        }

    # ------------------------------------------------------------------------
    # Flow C: EXTEND (Renew Subscription for 7 days)
    # ------------------------------------------------------------------------
    if upper_body == "EXTEND":
        spot_name = await subscriber_service.extend(session, phone_hash)
        if spot_name:
            reply = f"✅ Your WardAlert subscription for {spot_name} has been renewed for 7 days. Reply STATUS anytime for live risk."
            action = "extended"
            success = True
        else:
            reply = NO_SUBSCRIPTION_MSG
            action = "no_subscription"
            success = False

        twiml_str = build_twiml(reply)
        if is_form:
            return Response(content=twiml_str, media_type="application/xml")
        return {
            "success": success,
            "action": action,
            "reply_message": reply,
            "twiml": twiml_str,
        }

    # ------------------------------------------------------------------------
    # Flow D: STOP (Unsubscribe)
    # ------------------------------------------------------------------------
    if upper_body == "STOP":
        removed = await subscriber_service.unsubscribe(session, phone_hash)
        reply = "🛑 You have been unsubscribed from WardAlert. No further alerts will be sent. Send your location to resubscribe."
        twiml_str = build_twiml(reply)
        if is_form:
            return Response(content=twiml_str, media_type="application/xml")
        return {
            "success": True,
            "action": "unsubscribed",
            "reply_message": reply,
            "twiml": twiml_str,
        }

    # ------------------------------------------------------------------------
    # Flow E: STATUS (Query Current Flood Risk)
    # ------------------------------------------------------------------------
    if upper_body == "STATUS":
        sub = await subscriber_service.active(session, phone_hash)
        if not sub:
            sub = await subscriber_service.any_subscription(session, phone_hash)

        target_spot_id = sub["spot_id"] if sub else 1
        lang = sub["language"] if sub and sub.get("language") else Config.DEFAULT_LANGUAGE

        prediction = await prediction_service.predict_one(predictor, target_spot_id, None)
        status_msg = whatsapp_service.compose(prediction, lang)

        twiml_str = build_twiml(status_msg)
        if is_form:
            return Response(content=twiml_str, media_type="application/xml")
        return {
            "success": True,
            "action": "status_reply",
            "spot": {"id": target_spot_id, "name": prediction["spot_name"]},
            "reply_message": status_msg,
            "twiml": twiml_str,
        }

    # ------------------------------------------------------------------------
    # Flow F: Default / Help / Greeting → Onboarding Instructions
    # ------------------------------------------------------------------------
    twiml_str = build_twiml(ONBOARDING_MSG)
    if is_form:
        return Response(content=twiml_str, media_type="application/xml")
    return {
        "success": True,
        "action": "onboarding",
        "reply_message": ONBOARDING_MSG,
        "twiml": twiml_str,
    }
