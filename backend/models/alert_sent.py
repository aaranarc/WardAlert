from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class AlertSent(Base):
    __tablename__ = "alerts_sent"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    spot_id: Mapped[int | None] = mapped_column(ForeignKey("flood_spots.id"))
    prediction_id: Mapped[int | None] = mapped_column(ForeignKey("predictions.id"))
    language: Mapped[str] = mapped_column(String, nullable=False)
    recipient: Mapped[str | None] = mapped_column(String)
    channel: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    provider_sid: Mapped[str | None] = mapped_column(String)
    error: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    recipient_count: Mapped[int] = mapped_column(Integer, default=1)
