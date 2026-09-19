from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class DrainHealthWeekly(Base):
    __tablename__ = "drain_health_weekly"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    spot_id: Mapped[int] = mapped_column(ForeignKey("flood_spots.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    week_start: Mapped[date | None] = mapped_column(Date)
    avg_delta: Mapped[float] = mapped_column(Float, nullable=False)
    max_delta: Mapped[float] = mapped_column(Float, nullable=False)
    prediction_count: Mapped[int] = mapped_column(Integer, nullable=False)
    trend_slope: Mapped[float | None] = mapped_column(Float)
    trend_intercept: Mapped[float | None] = mapped_column(Float)
    predicted_failure_date: Mapped[date | None] = mapped_column(Date)
    health_score: Mapped[float | None] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
