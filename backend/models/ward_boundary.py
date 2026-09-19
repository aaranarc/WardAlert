from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class WardBoundary(Base):
    __tablename__ = "ward_boundary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ward_name: Mapped[str] = mapped_column(String, nullable=False)
    area_sqkm: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
