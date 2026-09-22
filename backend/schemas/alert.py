from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AlertRequest(BaseModel):
    spot_id: int
    language: str | None = Field(default=None, description="en | hi | hinglish | mr")
    recipient: str | None = Field(
        default=None, description="whatsapp:+91… ; defaults to ALERT_DEFAULT_RECIPIENT"
    )


class AlertResponse(BaseModel):
    id: int
    spot_id: int
    spot_name: str
    language: str
    recipient: str | None = None
    channel: str
    status: str = Field(description="sent (Twilio) | simulated (no credentials) | failed")
    provider_sid: str | None = None
    error: str | None = None
    body: str
    sent_at: datetime
    recipient_count: int = 1


class AlertLogEntry(BaseModel):
    id: int
    spot_id: int | None = None
    spot_name: str | None = None
    prediction_id: int | None = None
    language: str
    recipient: str | None = None
    channel: str
    status: str
    provider_sid: str | None = None
    error: str | None = None
    body: str
    sent_at: datetime
    recipient_count: int = 1


class BroadcastRequest(BaseModel):
    mode: str = Field(default="normal", description="normal | critical")
    language: str | None = Field(default=None, description="en | hi | hinglish | mr")


class BroadcastResponse(BaseModel):
    broadcast_id: int | None = Field(default=None, description="alerts_sent row recording the whole fan-out")
    broadcast_count: int = Field(description="active subscribers that were alerted")
    mode: str = Field(default="normal", description="normal | critical")
    channels: list[str] = Field(default_factory=lambda: ["whatsapp"], description="channels used for broadcast")
    message: str = Field(default="", description="Broadcast confirmation message")
    sample_payload: str | None = Field(default=None, description="Rendered sample message text")


class SubscriberCountResponse(BaseModel):
    spot_id: int
    spot_name: str
    spot_subscribers: int
    radius_subscribers: int
    critical_radius_km: float = 2.0


class PreviewResponse(BaseModel):
    rendered_message: str


class WebhookResponse(BaseModel):
    success: bool
    action: str | None = None
    spot: dict[str, Any] | None = None
    distance_m: float | None = None
    reply_message: str | None = None
    twiml: str | None = None
