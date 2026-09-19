from __future__ import annotations

from datetime import datetime

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


class BroadcastResponse(BaseModel):
    broadcast_count: int = Field(description="active subscribers of the spot that were alerted")
