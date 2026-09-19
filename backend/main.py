"""WardAlert API.

Models are loaded once in the lifespan rather than per request: two XGBoost
boosters plus a SHAP TreeExplainer take long enough that building them per call
would dominate response time.  A failure to load is recorded and surfaced by
/api/health as degraded rather than crashing the process, so the database-backed
endpoints keep serving while the models are retrained.

    uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db import engine
from backend.routers import drain_health, health, predict, spots
from config import Config

logger = logging.getLogger("wardalert")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.predictor = None
    app.state.model_error = None
    try:
        # Imported here so a missing model file degrades this one feature
        # rather than preventing the module from importing at all.
        from ml.predict import Predictor

        app.state.predictor = Predictor()
        logger.info(
            "models loaded: model_a, model_b, thresholds.json, feature_columns.json"
        )
    except Exception as exc:
        app.state.model_error = str(exc)
        logger.error("model load failed — /api/health will report degraded: %s", exc)

    yield

    await engine.dispose()


app = FastAPI(
    title=Config.API_TITLE,
    version=Config.API_VERSION,
    description=(
        "Hyperlocal flood prediction for Mumbai Ward G/South. Dual-model "
        "residual (P_actual − P_rain) separates rainfall-driven flooding from "
        "drainage failure, with SHAP explanations and learned thresholds."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(spots.router)
app.include_router(predict.router)
app.include_router(drain_health.router)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": Config.API_TITLE,
        "version": Config.API_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
