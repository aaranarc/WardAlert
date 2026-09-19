from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class DrainageSegment(Base):
    __tablename__ = "drainage_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    osm_id: Mapped[int | None] = mapped_column(BigInteger)
    name: Mapped[str | None] = mapped_column(String)
    drain_type: Mapped[str | None] = mapped_column(String)
    length_m: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
