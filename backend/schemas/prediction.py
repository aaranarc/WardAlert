from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from backend.schemas.spot import ShapFactor


class PredictRequest(BaseModel):
    spot_id: int = Field(description="flood_spots.id")
    timestamp: datetime | None = Field(
        default=None,
        description="Instant to predict for; defaults to now (UTC).",
    )


class PredictAllRequest(BaseModel):
    timestamp: datetime | None = None


class PredictionResponse(BaseModel):
    spot_id: int
    spot_name: str
    predicted_for: datetime

    p_rain: float = Field(description="Model A — flood probability from rainfall alone")
    p_actual: float = Field(description="Model B — flood probability given full context")
    delta: float = Field(description="p_actual − p_rain; risk the rainfall does not explain")

    risk_level: str = Field(description="low | moderate | high | critical (learned quartiles)")
    cause_label: str = Field(description="rainfall_driven | drainage_failure")
    dispatch_type: str = Field(description="pump_and_traffic | desilting_crew")

    confidence_lower: float
    confidence_upper: float
    shap_top3: list[ShapFactor]

    features: dict | None = None
    prediction_id: int | None = None
