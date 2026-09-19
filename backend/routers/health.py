"""GET /api/health — liveness for the API, the database, and the models."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_session
from backend.schemas.health import HealthResponse
from config import Config

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthResponse)
async def health(request: Request, session: AsyncSession = Depends(get_session)):
    db_ok = True
    detail = None
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:  # surfaced, not swallowed — this endpoint exists to report it
        db_ok = False
        detail = f"database: {exc}"

    models_loaded = getattr(request.app.state, "predictor", None) is not None
    if not models_loaded:
        startup_error = getattr(request.app.state, "model_error", None)
        detail = "; ".join(filter(None, [detail, f"models: {startup_error}" if startup_error else None]))

    return HealthResponse(
        status="ok" if (db_ok and models_loaded) else "degraded",
        db=db_ok,
        models_loaded=models_loaded,
        version=Config.API_VERSION,
        detail=detail or None,
    )
