from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class FloodEvent(Base):
    __tablename__ = "flood_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    spot_name: Mapped[str] = mapped_column(String, nullable=False)
    spot_id: Mapped[int | None] = mapped_column(ForeignKey("flood_spots.id"))
    match_score: Mapped[float | None] = mapped_column(Float)
    severity: Mapped[str | None] = mapped_column(String)
    source: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
