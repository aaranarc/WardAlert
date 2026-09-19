from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CrowdReportCreate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    severity: str | None = Field(
        default=None, description="e.g. ankle-deep | knee-deep | waist-deep"
    )
    note: str | None = None
    language: str | None = None
    reporter_ref: str | None = Field(
        default=None, description="opaque sender reference; never a raw phone number"
    )
    reported_at: datetime | None = None


class CrowdReportResponse(BaseModel):
    id: int
    reported_at: datetime
    lat: float
    lng: float
    severity: str | None = None
    note: str | None = None
    language: str | None = None
    spot_id: int | None = Field(default=None, description="nearest spot within CROWD_RADIUS_M")
    spot_name: str | None = None
    distance_m: float | None = None
    matched: bool = Field(description="false when no spot was within the radius")
