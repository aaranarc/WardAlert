from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class DrainHealthEntry(BaseModel):
    """One spot's standing in the maintenance leaderboard."""

    spot_id: int
    name: str
    lat: float
    lng: float
    health_score: float = Field(description="100 = Δ at zero, 0 = Δ at critical_delta")
    avg_delta: float
    max_delta: float
    weeks_tracked: int
    prediction_count: int
    trend_slope: float | None = Field(
        default=None, description="Δ change per week; positive means degrading"
    )
    predicted_failure_date: date | None = Field(
        default=None, description="week Δ crosses critical_delta; past date = overdue"
    )
    status: str = Field(description="overdue | degrading | stable | improving")


class WeeklyPoint(BaseModel):
    year: int
    week_number: int
    week_start: date | None = None
    avg_delta: float
    max_delta: float
    prediction_count: int
    health_score: float | None = None


class DesiltEventRecord(BaseModel):
    id: int | None = None
    spot_id: int
    desilted_at: datetime
    crew: str = "BMC Ward G-South"
    pre_residual: float
    projected_residual: float = 0.02


class ForwardProjectionPoint(BaseModel):
    week_offset: int
    date_str: str
    projected_residual: float
    projected_health: float


class DesiltResponse(BaseModel):
    spot_id: int
    spot_name: str
    desilted_at: datetime
    pre_residual: float
    projected_residual: float
    projected_health: float
    projected_slope: float
    predicted_failure: str
    message: str | None = None


class DrainHealthDetail(BaseModel):
    spot_id: int
    name: str
    lat: float
    lng: float
    health_score: float
    avg_delta: float
    max_delta: float
    weeks_tracked: int
    trend_slope: float | None = None
    trend_intercept: float | None = None
    predicted_failure_date: date | None = None
    critical_delta: float = Field(description="learned Δ level the trend extrapolates toward")
    status: str
    weekly: list[WeeklyPoint] = []
    desilt_events: list[DesiltEventRecord] = []
    forward_projection: list[ForwardProjectionPoint] = []
    message: str | None = None
