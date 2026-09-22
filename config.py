"""Single source of truth for every tunable value in WardAlert.

Nothing in this repo hardcodes a threshold, path, or credential.  Everything
is read here from the process environment (populated from `.env` when present),
with a development default that makes `docker-compose up -d db` + the loader
work out of the box.  See `.env.example` for documentation of each variable.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

try:  # python-dotenv is in requirements.txt but config must not hard-fail on it
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:  # pragma: no cover - only hit before `pip install`
    pass

REPO_ROOT = Path(__file__).resolve().parent


def _str(key: str, default: str) -> str:
    return os.environ.get(key, default)


def _int(key: str, default: int) -> int:
    raw = os.environ.get(key)
    return default if raw is None or raw == "" else int(raw)


def _float(key: str, default: float) -> float:
    raw = os.environ.get(key)
    return default if raw is None or raw == "" else float(raw)


def _list(key: str, default: str) -> list[str]:
    raw = os.environ.get(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _path(key: str, default: str) -> Path:
    """Resolve a configured path against the repo root unless it is absolute."""
    raw = Path(os.environ.get(key, default))
    return raw if raw.is_absolute() else REPO_ROOT / raw


class Config:
    # ------------------------------------------------------------ database --
    POSTGRES_USER = _str("POSTGRES_USER", "wardalert")
    POSTGRES_PASSWORD = _str("POSTGRES_PASSWORD", "wardalert")
    POSTGRES_DB = _str("POSTGRES_DB", "wardalert")
    POSTGRES_HOST = _str("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = _int("POSTGRES_PORT", 5432)
    DB_CONNECT_TIMEOUT = _int("DB_CONNECT_TIMEOUT", 60)

    @classmethod
    def sync_dsn(cls) -> str:
        """psycopg2 / SQLAlchemy-sync connection string (loaders, training)."""
        return (
            f"postgresql://{cls.POSTGRES_USER}:{cls.POSTGRES_PASSWORD}"
            f"@{cls.POSTGRES_HOST}:{cls.POSTGRES_PORT}/{cls.POSTGRES_DB}"
        )

    @classmethod
    def async_dsn(cls) -> str:
        """asyncpg connection string (FastAPI)."""
        return (
            f"postgresql+asyncpg://{cls.POSTGRES_USER}:{cls.POSTGRES_PASSWORD}"
            f"@{cls.POSTGRES_HOST}:{cls.POSTGRES_PORT}/{cls.POSTGRES_DB}"
        )

    # ---------------------------------------------------------------- data --
    DATA_DIR = _path("DATA_DIR", "data")
    WARD_BOUNDARY_FILE = _path("WARD_BOUNDARY_FILE", "data/processed/ward_gsouth_boundary.geojson")
    DRAINAGE_FILE = _path("DRAINAGE_FILE", "data/processed/drainage_gsouth.geojson")
    FLOOD_SPOTS_FILE = _path("FLOOD_SPOTS_FILE", "data/processed/flood_spots_gsouth.csv")
    RAINFALL_FILE = _path("RAINFALL_FILE", "data/processed/rainfall_daily_gsouth.csv")
    FLOOD_EVENTS_FILE = _path("FLOOD_EVENTS_FILE", "data/processed/flood_events_gsouth.csv")
    DEM_FILE = _path("DEM_FILE", "data/raw/N19E072.hgt")
    WARD_NAME = _str("WARD_NAME", "G/South")

    # ---------------------------------------------------------- geospatial --
    SRID = _int("SRID", 4326)
    METRIC_SRID = _int("METRIC_SRID", 32643)
    DEPRESSION_RADIUS_M = _float("DEPRESSION_RADIUS_M", 150.0)

    # ------------------------------------------------------ label matching --
    FUZZY_MATCH_THRESHOLD = _float("FUZZY_MATCH_THRESHOLD", 0.7)

    # ------------------------------------------------ feature engineering --
    MONSOON_START_MONTH = _int("MONSOON_START_MONTH", 6)
    MONSOON_END_MONTH = _int("MONSOON_END_MONTH", 9)
    NEG_POS_RATIO = _int("NEG_POS_RATIO", 5)
    FALLBACK_NEG_POS_RATIO = _int("FALLBACK_NEG_POS_RATIO", 10)
    MIN_DATASET_ROWS = _int("MIN_DATASET_ROWS", 100)
    ANTECEDENT_DAYS = _int("ANTECEDENT_DAYS", 3)
    ANTECEDENT_DECAY = _float("ANTECEDENT_DECAY", 0.5)
    RAIN_PEAK_HOUR = _int("RAIN_PEAK_HOUR", 16)
    RAIN_DECAY_SIGMA_H = _float("RAIN_DECAY_SIGMA_H", 4.0)
    NEGATIVE_EXCLUSION_HOURS = _int("NEGATIVE_EXCLUSION_HOURS", 48)
    RANDOM_SEED = _int("RANDOM_SEED", 42)

    # ---------------------------------------------------------- crowd input --
    CROWD_RADIUS_M = _float("CROWD_RADIUS_M", 500.0)
    CROWD_WINDOW_HOURS = _int("CROWD_WINDOW_HOURS", 2)
    CROWD_DECAY_HOURS = _float("CROWD_DECAY_HOURS", 2.0)

    # ----------------------------------------------------------- modelling --
    TEST_SIZE = _float("TEST_SIZE", 0.25)
    XGB_N_ESTIMATORS = _int("XGB_N_ESTIMATORS", 200)
    XGB_MAX_DEPTH = _int("XGB_MAX_DEPTH", 3)
    XGB_LEARNING_RATE = _float("XGB_LEARNING_RATE", 0.08)
    XGB_SUBSAMPLE = _float("XGB_SUBSAMPLE", 0.9)
    XGB_COLSAMPLE_BYTREE = _float("XGB_COLSAMPLE_BYTREE", 0.9)
    XGB_MIN_CHILD_WEIGHT = _float("XGB_MIN_CHILD_WEIGHT", 1.0)
    XGB_REG_LAMBDA = _float("XGB_REG_LAMBDA", 1.0)
    MIN_MODEL_A_AUC = _float("MIN_MODEL_A_AUC", 0.60)
    MODEL_DIR = _path("MODEL_DIR", "ml/models")

    MODEL_A_FEATURES = [
        "rain_1h",
        "rain_3h",
        "rain_24h",
        "antecedent_moisture",
        "elevation_m",
        "depression_depth_m",
    ]
    MODEL_B_EXTRA_FEATURES = [
        "drain_distance_m",
        "monsoon_week",
        "hour_of_day",
        "crowd_reports_500m_2h",
    ]

    @classmethod
    def model_b_features(cls) -> list[str]:
        return cls.MODEL_A_FEATURES + cls.MODEL_B_EXTRA_FEATURES

    @classmethod
    def xgb_params(cls) -> dict:
        return {
            "n_estimators": cls.XGB_N_ESTIMATORS,
            "max_depth": cls.XGB_MAX_DEPTH,
            "learning_rate": cls.XGB_LEARNING_RATE,
            "subsample": cls.XGB_SUBSAMPLE,
            "colsample_bytree": cls.XGB_COLSAMPLE_BYTREE,
            "min_child_weight": cls.XGB_MIN_CHILD_WEIGHT,
            "reg_lambda": cls.XGB_REG_LAMBDA,
            "objective": "binary:logistic",
            "eval_metric": "logloss",
            "random_state": cls.RANDOM_SEED,
        }

    # ---------------------------------------------------------- thresholds --
    # Absolute metres defining a "drain-related" flood. 0 (the default) means
    # derive the cutoff from the data instead — see DRAIN_PROXIMITY_PERCENTILE.
    DRAIN_PROXIMITY_M = _float("DRAIN_PROXIMITY_M", 0.0)
    # Percentile of the observed nearest_drain_m distribution used as that
    # cutoff. 50 splits the ward into its drain-served and drain-starved halves.
    DRAIN_PROXIMITY_PERCENTILE = _float("DRAIN_PROXIMITY_PERCENTILE", 50.0)
    CRITICAL_DELTA_PERCENTILE = _float("CRITICAL_DELTA_PERCENTILE", 90.0)

    # ------------------------------------------------- operating thresholds --
    # Fixed cuts, not learned: quartiles of mostly-dry test days put every spot
    # in "critical" as soon as it rained.  ml.learn_thresholds no longer writes
    # these, so re-running the pipeline cannot overwrite them.
    RISK_TIER_LOW_MAX = _float("RISK_TIER_LOW_MAX", 0.4)
    RISK_TIER_MODERATE_MAX = _float("RISK_TIER_MODERATE_MAX", 0.6)
    RISK_TIER_HIGH_MAX = _float("RISK_TIER_HIGH_MAX", 0.8)
    CAUSE_DELTA_THRESHOLD = _float("CAUSE_DELTA_THRESHOLD", 0.15)  # Δ ≥ this → drainage_failure
    DRAIN_SLOPE_MIN = _float("DRAIN_SLOPE_MIN", 0.0005)  # weekly Δ slope above this → degrading
    DRAIN_CRITICAL_DELTA = _float("DRAIN_CRITICAL_DELTA", 0.30)  # health score hits 0 here
    CONFIDENCE_PRIOR_ALPHA = _float("CONFIDENCE_PRIOR_ALPHA", 1.0)
    CONFIDENCE_PRIOR_BETA = _float("CONFIDENCE_PRIOR_BETA", 1.0)
    CONFIDENCE_LEVEL = _float("CONFIDENCE_LEVEL", 0.90)
    CONFIDENCE_STRENGTH = _float("CONFIDENCE_STRENGTH", 30.0)

    # Canonical replay timestamp for historical cloudburst event
    HERO_TIMESTAMP = datetime(2025, 7, 15, 10, 30, tzinfo=timezone.utc)
    HERO_TIMESTAMP_ISO = "2025-07-15T10:30:00Z"

    # -------------------------------------------------------- drain health --
    DRAIN_HEALTH_MIN_WEEKS = _int("DRAIN_HEALTH_MIN_WEEKS", 4)
    BOOTSTRAP_YEARS = [int(y) for y in _list("BOOTSTRAP_YEARS", "2023,2024,2025")]
    BOOTSTRAP_HOUR = _int("BOOTSTRAP_HOUR", 16)
    # Timestamps sampled within each bootstrap week. One sample per week would
    # make avg_delta, max_delta and prediction_count vacuous (every week would
    # aggregate a single row), so the week is probed at several hours.
    BOOTSTRAP_SAMPLES_PER_WEEK = _int("BOOTSTRAP_SAMPLES_PER_WEEK", 3)

    # ----------------------------------------------------------------- api --
    API_HOST = _str("API_HOST", "0.0.0.0")
    API_PORT = _int("API_PORT", 8000)
    CORS_ORIGINS = _list(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:8000"
    )
    API_TITLE = _str("API_TITLE", "WardAlert API")
    API_VERSION = _str("API_VERSION", "0.1.0")

    # -------------------------------------------------------------- alerts --
    TEMPLATE_DIR = _path("TEMPLATE_DIR", "whatsapp_templates")
    DEFAULT_LANGUAGE = _str("DEFAULT_LANGUAGE", "en")
    SUPPORTED_LANGUAGES = _list("SUPPORTED_LANGUAGES", "en,hi,hinglish,mr")
    TWILIO_ACCOUNT_SID = _str("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = _str("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_FROM = _str("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    ALERT_DEFAULT_RECIPIENT = _str("ALERT_DEFAULT_RECIPIENT", "whatsapp:+910000000000")
    CRITICAL_RADIUS_KM = _float("CRITICAL_RADIUS_KM", 2.0)

    @classmethod
    def twilio_enabled(cls) -> bool:
        return bool(cls.TWILIO_ACCOUNT_SID and cls.TWILIO_AUTH_TOKEN)

    # ------------------------------------------------------------- helpers --
    @classmethod
    def thresholds_path(cls) -> Path:
        return cls.MODEL_DIR / "thresholds.json"

    @classmethod
    def feature_columns_path(cls) -> Path:
        return cls.MODEL_DIR / "feature_columns.json"

    @classmethod
    def model_path(cls, which: str) -> Path:
        return cls.MODEL_DIR / f"model_{which}.joblib"


config = Config()
