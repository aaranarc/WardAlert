"""GET /api/spots and /api/spots/{id} — the map layer.

Both read v_latest_risk, which LEFT JOINs the newest prediction onto every
spot, so all 30 spots are returned even before anything has been predicted.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.schemas.spot import (
    HistoricalPrediction,
    SpotDetail,
    SpotRisk,
    SubscriberCount,
)
from backend.services import subscriber_service

router = APIRouter(prefix="/api/spots", tags=["spots"])

LATEST_RISK_COLUMNS = """
    spot_id, name, lat, lng, elevation_m, depression_depth_m, nearest_drain_m,
    notes, predicted_for, p_rain, p_actual, delta, risk_level, cause_label,
    dispatch_type, confidence_lower, confidence_upper, shap_top3
"""


@router.get("", response_model=list[SpotRisk])
async def list_spots(session: AsyncSession = Depends(get_session)):
    result = await session.execute(text(f"SELECT {LATEST_RISK_COLUMNS} FROM v_latest_risk"))
    return [SpotRisk(**dict(row)) for row in result.mappings()]


@router.get("/{spot_id}", response_model=SpotDetail)
async def get_spot(
    spot_id: int,
    history_hours: int = Query(24, ge=1, le=24 * 365, description="history window"),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        text(f"SELECT {LATEST_RISK_COLUMNS} FROM v_latest_risk WHERE spot_id = :spot_id"),
        {"spot_id": spot_id},
    )
    row = result.mappings().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"spot {spot_id} not found"
        )

    # History is relative to that spot's newest prediction rather than now, so
    # a spot last predicted during the 2025 monsoon still shows its series.
    history_result = await session.execute(
        text(
            """
            SELECT predicted_for, p_rain, p_actual, delta, risk_level
              FROM predictions
             WHERE spot_id = :spot_id
               AND predicted_for > (
                     SELECT MAX(predicted_for) FROM predictions WHERE spot_id = :spot_id
                   ) - (:hours * INTERVAL '1 hour')
             ORDER BY predicted_for DESC
            """
        ),
        {"spot_id": spot_id, "hours": history_hours},
    )
    return SpotDetail(**dict(row), history=[dict(h) for h in history_result.mappings()])


@router.get("/{spot_id}/subscriber-count", response_model=SubscriberCount)
async def subscriber_count(spot_id: int, session: AsyncSession = Depends(get_session)):
    return {"count": await subscriber_service.count_for_spot(session, spot_id)}


@router.get("/{spot_id}/random-historical", response_model=HistoricalPrediction)
async def get_random_historical(
    spot_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        text(
            """
            SELECT spot_id, predicted_for, p_rain, p_actual, delta, risk_level,
                   cause_label, dispatch_type, confidence_lower, confidence_upper,
                   shap_top3
              FROM predictions
             WHERE spot_id = :spot_id
               AND predicted_for < NOW()
               AND p_actual IS NOT NULL
             ORDER BY RANDOM()
             LIMIT 1
            """
        ),
        {"spot_id": spot_id},
    )
    row = result.mappings().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No historical predictions for this spot",
        )
    return HistoricalPrediction(**dict(row))

