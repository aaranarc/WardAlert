from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class DesiltEvent(Base):
    __tablename__ = "desilt_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    spot_id: Mapped[int] = mapped_column(ForeignKey("flood_spots.id", ondelete="CASCADE"), nullable=False)
    desilted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    crew: Mapped[str] = mapped_column(String(255), default="BMC Ward G-South", nullable=False)
    pre_residual: Mapped[float] = mapped_column(Float, nullable=False)
    projected_residual: Mapped[float] = mapped_column(Float, default=0.02, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
