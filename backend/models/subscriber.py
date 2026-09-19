from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class Subscriber(Base):
    __tablename__ = "subscribers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phone_hash: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    spot_id: Mapped[int] = mapped_column(ForeignKey("flood_spots.id"), nullable=False)
    language: Mapped[str | None] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
