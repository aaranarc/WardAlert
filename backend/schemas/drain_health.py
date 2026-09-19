from __future__ import annotations

from datetime import date

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
