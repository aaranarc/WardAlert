"""Orchestrates a prediction request.

The actual work lives in ml.predict.Predictor, which the drain-health
bootstrap also calls, so an API response and a stored historical prediction are
produced by identical code.  This service adapts that to the request/response
world: it runs the blocking model call off the event loop and maps unknown
spots onto a 404.

ml.predict uses psycopg2 while the API uses asyncpg. Rather than duplicate the
feature SQL in async form, the synchronous call is handed to a worker thread —
inference is CPU-bound and short, so a thread is the right tool.
"""
from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from starlette.concurrency import run_in_threadpool

from ml.predict import Predictor


async def predict_one(predictor: Predictor, spot_id: int, moment: datetime | None) -> dict:
    try:
        return await run_in_threadpool(predictor.predict_one, spot_id, moment)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"spot {spot_id} not found"
        ) from exc


async def predict_all(predictor: Predictor, moment: datetime | None) -> list[dict]:
    return await run_in_threadpool(predictor.predict_all, moment)
