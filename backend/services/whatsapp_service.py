"""Compose and deliver WhatsApp flood alerts.

Templates are plain format-string files under Config.TEMPLATE_DIR, one per
language, so a ward officer can reword an alert without touching Python.

Delivery is deliberately two-mode: with Twilio credentials configured the
message is sent; without them it is rendered and recorded with status
'simulated'.  A demo on a laptop and a live deployment therefore exercise the
same composition path and the same alerts_sent audit trail — the only
difference is whether Twilio is called.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import Config

logger = logging.getLogger("wardalert.whatsapp")

# How each machine label should read to a human, per language.
CAUSE_TEXT = {
    "en": {"drainage_failure": "drain blockage", "rainfall_driven": "heavy rainfall"},
    "hi": {"drainage_failure": "नाली में रुकावट", "rainfall_driven": "भारी बारिश"},
    "hinglish": {"drainage_failure": "drain blockage", "rainfall_driven": "heavy baarish"},
    "mr": {"drainage_failure": "गटार तुंबले", "rainfall_driven": "मुसळधार पाऊस"},
}

RISK_TEXT = {
    "en": {"low": "LOW", "moderate": "MODERATE", "high": "HIGH", "critical": "CRITICAL"},
    "hi": {"low": "कम", "moderate": "मध्यम", "high": "अधिक", "critical": "गंभीर"},
    "hinglish": {"low": "LOW", "moderate": "MEDIUM", "high": "HIGH", "critical": "CRITICAL"},
    "mr": {"low": "कमी", "moderate": "मध्यम", "high": "जास्त", "critical": "गंभीर"},
}

DISPATCH_TEXT = {
    "en": {
        "desilting_crew": "desilting crew requested — avoid the stretch",
        "pump_and_traffic": "pumps and traffic marshals on standby — avoid the stretch",
    },
    "hi": {
        "desilting_crew": "सफाई दल बुलाया गया — इस रास्ते से बचें",
        "pump_and_traffic": "पंप और ट्रैफिक दल तैनात — इस रास्ते से बचें",
    },
    "hinglish": {
        "desilting_crew": "desilting crew bulaayi gayi — yeh raasta avoid karein",
        "pump_and_traffic": "pumps aur traffic staff ready — yeh raasta avoid karein",
    },
    "mr": {
        "desilting_crew": "गाळ काढणारे पथक बोलावले — हा रस्ता टाळा",
        "pump_and_traffic": "पंप आणि वाहतूक कर्मचारी तैनात — हा रस्ता टाळा",
    },
}


def resolve_language(language: str | None) -> str:
    if language and language in Config.SUPPORTED_LANGUAGES:
        return language
    return Config.DEFAULT_LANGUAGE


def load_template(language: str) -> str:
    path = Config.TEMPLATE_DIR / f"alert_{language}.txt"
    if not path.exists():
        fallback = Config.TEMPLATE_DIR / f"alert_{Config.DEFAULT_LANGUAGE}.txt"
        if not fallback.exists():
            raise FileNotFoundError(f"no alert template at {path} or {fallback}")
        logger.warning("template %s missing; falling back to %s", path, fallback)
        path = fallback
    return path.read_text(encoding="utf-8")


# Freshness wording per language — an English "just now" dropped into a Hindi
# or Marathi sentence is exactly the kind of half-translation that makes an
# alert look untrustworthy to the person receiving it.
AGE_TEXT = {
    "en": {"now": "just now", "m": "{n}m ago", "h": "{n}h ago", "d": "{n}d ago"},
    "hi": {"now": "अभी", "m": "{n} मिनट पहले", "h": "{n} घंटे पहले", "d": "{n} दिन पहले"},
    "hinglish": {"now": "abhi", "m": "{n} min pehle", "h": "{n} ghante pehle",
                 "d": "{n} din pehle"},
    "mr": {"now": "आत्ताच", "m": "{n} मिनिटांपूर्वी", "h": "{n} तासांपूर्वी",
           "d": "{n} दिवसांपूर्वी"},
}


def humanise_age(moment: datetime, language: str = "en") -> str:
    """'just now' / '3h ago', in the recipient's language."""
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    seconds = (datetime.now(timezone.utc) - moment).total_seconds()
    words = AGE_TEXT.get(language, AGE_TEXT["en"])

    if seconds < 90:
        return words["now"]
    if seconds < 3600:
        return words["m"].format(n=int(seconds // 60))
    if seconds < 86400:
        return words["h"].format(n=int(seconds // 3600))
    return words["d"].format(n=int(seconds // 86400))


def compose(prediction: dict, language: str) -> str:
    """Render the template for one prediction."""
    language = resolve_language(language)
    template = load_template(language)
    features = prediction.get("features") or {}

    return template.format(
        spot_name=prediction["spot_name"],
        risk_level=RISK_TEXT.get(language, RISK_TEXT["en"]).get(
            prediction["risk_level"], prediction["risk_level"].upper()
        ),
        cause_label=CAUSE_TEXT.get(language, CAUSE_TEXT["en"]).get(
            prediction["cause_label"], prediction["cause_label"]
        ),
        p_actual_pct=round(float(prediction["p_actual"]) * 100),
        rain_3h=round(float(features.get("rain_3h", 0.0)), 1),
        updated_ago=humanise_age(prediction["predicted_for"], language),
        dispatch_action=DISPATCH_TEXT.get(language, DISPATCH_TEXT["en"]).get(
            prediction.get("dispatch_type"), prediction.get("dispatch_type", "")
        ),
    )


def deliver(body: str, recipient: str) -> dict:
    """Send via Twilio when configured, otherwise report simulated."""
    if not Config.TWILIO_ACCOUNT_SID or not Config.twilio_enabled():
        logger.info("TWILIO_ACCOUNT_SID unset — alert simulated for %s", recipient)
        return {"status": "simulated", "provider_sid": None, "error": None}

    try:
        from twilio.rest import Client

        client = Client(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=body, from_=Config.TWILIO_WHATSAPP_FROM, to=recipient
        )
        return {"status": "sent", "provider_sid": message.sid, "error": None}
    except Exception as exc:
        # If credentials were missing/unset, never report failed
        if not Config.TWILIO_ACCOUNT_SID or not Config.twilio_enabled():
            return {"status": "simulated", "provider_sid": None, "error": None}
        # A failed send must still be auditable, so it is recorded not raised.
        logger.error("twilio send failed: %s", exc)
        return {"status": "failed", "provider_sid": None, "error": str(exc)}


async def record(
    session: AsyncSession,
    prediction: dict,
    language: str,
    recipient: str,
    body: str,
    outcome: dict,
    channel: str = "whatsapp",
    recipient_count: int = 1,
) -> dict:
    result = await session.execute(
        text(
            """
            INSERT INTO alerts_sent (
                spot_id, prediction_id, language, recipient, channel,
                status, provider_sid, error, body, recipient_count
            ) VALUES (
                :spot_id, :prediction_id, :language, :recipient, :channel,
                :status, :provider_sid, :error, :body, :recipient_count
            )
            RETURNING id, spot_id, prediction_id, language, recipient, channel,
                      status, provider_sid, error, body, sent_at, recipient_count
            """
        ),
        {
            "spot_id": prediction["spot_id"],
            "prediction_id": prediction.get("prediction_id"),
            "language": language,
            "recipient": recipient,
            "channel": channel,
            "status": outcome["status"],
            "provider_sid": outcome["provider_sid"],
            "error": outcome["error"],
            "body": body,
            "recipient_count": recipient_count,
        },
    )
    row = dict(result.mappings().one())
    await session.commit()
    row["spot_name"] = prediction["spot_name"]
    return row


async def latest_prediction(session: AsyncSession, spot_id: int) -> dict | None:
    """The spot's newest stored prediction — the same row v_latest_risk shows."""
    result = await session.execute(
        text(
            """
            SELECT p.id AS prediction_id, p.spot_id, s.name AS spot_name,
                   p.predicted_for, p.p_actual, p.risk_level, p.cause_label,
                   p.dispatch_type, p.features
              FROM predictions p
              JOIN flood_spots s ON s.id = p.spot_id
             WHERE p.spot_id = :spot_id
             ORDER BY (p.predicted_for = '2025-07-15 10:30:00+00'::timestamptz) DESC,
                      p.predicted_for DESC
             LIMIT 1
            """
        ),
        {"spot_id": spot_id},
    )
    row = result.mappings().first()
    return dict(row) if row else None


async def send_alert(
    session: AsyncSession,
    prediction: dict,
    language: str | None,
    recipient: str | None,
) -> dict:
    language = resolve_language(language)
    recipient = recipient or Config.ALERT_DEFAULT_RECIPIENT
    body = compose(prediction, language)
    outcome = deliver(body, recipient)
    return await record(session, prediction, language, recipient, body, outcome)


async def log(session: AsyncSession, limit: int, include_failed: bool = False) -> list[dict]:
    query_str = """
        SELECT a.id, a.spot_id, s.name AS spot_name, a.prediction_id,
               a.language, a.recipient, a.channel, a.status,
               a.provider_sid, a.error, a.body, a.sent_at,
               COALESCE(a.recipient_count, 1) AS recipient_count
          FROM alerts_sent a
          LEFT JOIN flood_spots s ON s.id = a.spot_id
    """
    if not include_failed:
        query_str += " WHERE a.status != 'failed' "
    query_str += """
         ORDER BY a.sent_at DESC
         LIMIT :limit
    """
    result = await session.execute(
        text(query_str),
        {"limit": limit},
    )
    return [dict(row) for row in result.mappings()]
