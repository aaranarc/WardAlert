from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class RainfallDaily(Base):
    __tablename__ = "rainfall_daily"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    rainfall_mm: Mapped[float] = mapped_column(Float, nullable=False)
    source: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
