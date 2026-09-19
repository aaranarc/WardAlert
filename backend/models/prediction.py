from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    spot_id: Mapped[int] = mapped_column(ForeignKey("flood_spots.id"), nullable=False)
    predicted_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    p_rain: Mapped[float] = mapped_column(Float, nullable=False)
    p_actual: Mapped[float] = mapped_column(Float, nullable=False)
    delta: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String, nullable=False)
    cause_label: Mapped[str] = mapped_column(String, nullable=False)
    dispatch_type: Mapped[str | None] = mapped_column(String)
    confidence_lower: Mapped[float | None] = mapped_column(Float)
    confidence_upper: Mapped[float | None] = mapped_column(Float)
    shap_top3: Mapped[list | None] = mapped_column(JSONB)
    features: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
