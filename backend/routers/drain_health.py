"""GET /api/drain-health — the maintenance leaderboard and per-spot trend.

This is the module that turns prediction into scheduling: instead of sending a
desilting crew after a road floods, the ward can send it to the drain whose Δ
trend says it is silting up now.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.schemas.drain_health import DrainHealthDetail, DrainHealthEntry
from backend.services import drain_health_service

router = APIRouter(prefix="/api/drain-health", tags=["drain-health"])


def _critical_delta(request: Request) -> float:
    """The learned Δ level, from the thresholds loaded at startup."""
    predictor = getattr(request.app.state, "predictor", None)
    if predictor is None:
        return 0.0
    return float(predictor.thresholds.get("critical_delta", 0.0))


@router.get("", response_model=list[DrainHealthEntry])
async def get_leaderboard(
    limit: int | None = Query(None, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    return await drain_health_service.leaderboard(session, limit)


@router.get("/{spot_id}", response_model=DrainHealthDetail)
async def get_detail(
    spot_id: int,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    result = await drain_health_service.detail(session, spot_id, _critical_delta(request))
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"no drain health history for spot {spot_id} — "
                "run `python -m drain_health.main`"
            ),
        )
    return result
