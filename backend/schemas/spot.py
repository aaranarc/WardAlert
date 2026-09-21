from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ShapFactor(BaseModel):
    feature: str
    label: str
    value: float
    shap_value: float
    direction: str


class SpotRisk(BaseModel):
    """A spot plus its most recent prediction (nulls when never predicted)."""

    spot_id: int
    name: str
    lat: float
    lng: float
    elevation_m: float | None = None
    depression_depth_m: float | None = None
    nearest_drain_m: float | None = None
    notes: str | None = None

    predicted_for: datetime | None = None
    p_rain: float | None = None
    p_actual: float | None = None
    delta: float | None = None
    risk_level: str | None = None
    cause_label: str | None = None
    dispatch_type: str | None = None
    confidence_lower: float | None = None
    confidence_upper: float | None = None
    shap_top3: list[ShapFactor] | None = None


class SpotHistoryPoint(BaseModel):
    predicted_for: datetime
    p_rain: float
    p_actual: float
    delta: float
    risk_level: str


class SpotDetail(SpotRisk):
    """Spot detail with its recent prediction history."""

    history: list[SpotHistoryPoint] = []


class SubscriberCount(BaseModel):
    count: int


class HistoricalPrediction(BaseModel):
    spot_id: int | None = None
    predicted_for: datetime
    p_rain: float
    p_actual: float
    delta: float
    risk_level: str
    cause_label: str
    dispatch_type: str
    confidence_lower: float | None = None
    confidence_upper: float | None = None
    shap_top3: list[ShapFactor] | None = None

