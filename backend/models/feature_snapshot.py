from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class FeatureSnapshot(Base):
    __tablename__ = "feature_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    spot_id: Mapped[int] = mapped_column(ForeignKey("flood_spots.id"), nullable=False)
    snapshot_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    rain_1h: Mapped[float | None] = mapped_column(Float)
    rain_3h: Mapped[float | None] = mapped_column(Float)
    rain_24h: Mapped[float | None] = mapped_column(Float)
    antecedent_moisture: Mapped[float | None] = mapped_column(Float)
    elevation_m: Mapped[float | None] = mapped_column(Float)
    depression_depth_m: Mapped[float | None] = mapped_column(Float)
    drain_distance_m: Mapped[float | None] = mapped_column(Float)
    monsoon_week: Mapped[int | None] = mapped_column(Integer)
    hour_of_day: Mapped[int | None] = mapped_column(Integer)
    crowd_reports_500m_2h: Mapped[int] = mapped_column(Integer, nullable=False)
    crowd_weighted_score: Mapped[float] = mapped_column(Float, nullable=False)
    drain_related: Mapped[bool | None] = mapped_column(Boolean)
    flooded: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
