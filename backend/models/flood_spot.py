from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class FloodSpot(Base):
    __tablename__ = "flood_spots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(String)
    elevation_m: Mapped[float | None] = mapped_column(Float)
    depression_depth_m: Mapped[float | None] = mapped_column(Float)
    nearest_drain_m: Mapped[float | None] = mapped_column(Float)
    nearest_drain_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
