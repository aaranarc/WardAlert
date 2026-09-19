"""POST /api/crowd-report and GET /api/crowd-reports.

Citizen reports are the ground truth the models cannot get from rainfall data:
they feed crowd_reports_500m_2h, which Model B uses directly.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.schemas.crowd_report import CrowdReportCreate, CrowdReportResponse
from backend.services import crowd_match_service

router = APIRouter(tags=["crowd"])


@router.post("/api/crowd-report", response_model=CrowdReportResponse, status_code=201)
async def create_report(
    payload: CrowdReportCreate, session: AsyncSession = Depends(get_session)
):
    return await crowd_match_service.create(session, payload)


@router.get("/api/crowd-reports", response_model=list[CrowdReportResponse])
async def list_reports(
    hours: int = Query(24, ge=1, le=24 * 365),
    limit: int = Query(100, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
):
    return await crowd_match_service.recent(session, hours, limit)
