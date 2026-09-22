"""GET /api/drain-health — the maintenance leaderboard and per-spot trend.

This is the module that turns prediction into scheduling: instead of sending a
desilting crew after a road floods, the ward can send it to the drain whose Δ
trend says it is silting up now.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.schemas.drain_health import (
    DesiltResponse,
    DrainHealthDetail,
    DrainHealthEntry,
)
from backend.services import drain_health_service
from config import Config

router = APIRouter(prefix="/api/drain-health", tags=["drain-health"])


@router.get("", response_model=list[DrainHealthEntry])
async def get_leaderboard(
    limit: int | None = Query(None, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    return await drain_health_service.leaderboard(session, limit)


@router.get("/{spot_id}", response_model=DrainHealthDetail)
async def get_detail(
    spot_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await drain_health_service.detail(session, spot_id, Config.DRAIN_CRITICAL_DELTA)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"no drain health history for spot {spot_id} — "
                "run `python -m drain_health.main`"
            ),
        )
    return result


@router.get("/{spot_id}/weekly", response_model=DrainHealthDetail)
async def get_weekly(
    spot_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Alias for detail returning weekly points, historical desilt events, and recovery projection."""
    result = await drain_health_service.detail(session, spot_id, Config.DRAIN_CRITICAL_DELTA)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"no drain health history for spot {spot_id}",
        )
    return result


@router.post("/{spot_id}/desilt", response_model=DesiltResponse)
async def desilt_drain(
    spot_id: int,
    session: AsyncSession = Depends(get_session),
):
    result = await drain_health_service.record_desilt(session, spot_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"spot {spot_id} not found",
        )
    return result
