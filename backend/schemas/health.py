from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(description="ok when the API, database, and models are all usable")
    db: bool = Field(description="database reachable")
    models_loaded: bool = Field(description="both XGBoost models and thresholds.json in memory")
    version: str
    detail: str | None = None
