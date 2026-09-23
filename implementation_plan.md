# WardAlert Production Stack Setup Plan

This plan details the full transition of **WardAlert** from the standalone mock engine to the complete production stack utilizing **PostgreSQL/PostGIS**, **Python FastAPI**, real **XGBoost & SHAP ML models**, and the **Next.js Frontend**.

---

## Technical Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                 Next.js Frontend (Port 3000)                │
 └──────────────────────────────┬──────────────────────────────┘
                                │ REST API Requests
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                Python FastAPI Backend (Port 8000)           │
 ├──────────────────────────────┬──────────────────────────────┤
 │  ML Inference Engine         │  Geospatial & DB Services    │
 │  - Model A (Rainfall baseline)│  - PostGIS Spatial Queries   │
 │  - Model B (Full Context ML) │  - SQLAlchemy Async Database │
 │  - SHAP Explainer (Tree SHAP)│  - Real-time Alert Router    │
 └──────────────┬───────────────┴──────────────┬───────────────┘
                │                              │
                ▼                              ▼
 ┌─────────────────────────────┐ ┌─────────────────────────────┐
 │  Trained ML Artifacts       │ │ PostgreSQL / PostGIS DB     │
 │  - model_a.joblib           │ │ (Docker Container on 5432)  │
 │  - model_b.joblib           │ │ - 30 Chronic Flood Spots    │
 │  - thresholds.json          │ │ - 54 Drainage GIS Polylines │
 └─────────────────────────────┘ └─────────────────────────────┘
```

---

## Step-by-Step Execution Steps

### 1. Environment Setup
- Copy `.env.example` to `.env` with database settings (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`).

### 2. Database Layer Setup (PostgreSQL / PostGIS)
- Spin up the PostGIS container via Docker:
  ```bash
  docker compose up -d db
  ```
- Initialize schema tables (`database/init.sql`) for chronic spots, drainage polylines, daily rainfall series, and subscribers.

### 3. Data Ingestion Pipeline
- Ingest real datasets into PostGIS using Python:
  - 30 BMC chronic waterlogging spots (`data/processed/flood_spots_gsouth.csv`)
  - 54 OSM drainage line segments (`data/processed/drainage_gsouth.geojson`)
  - 1,096 days of CHIRPS/ERA5 rainfall (`data/processed/rainfall_daily_gsouth.csv`)
  - 32 verified historical monsoon flood events (`data/processed/flood_events_gsouth.csv`)

### 4. ML Model Training & Artifact Generation
- Train **Model A** (hydrometeorological baseline): `ml/train_model_a.py`
- Train **Model B** (full spatial XGBoost model): `ml/train_model_b.py`
- Optimize decision thresholds (Youden J index): `ml/learn_thresholds.py`
- Generate serialized artifacts: `model_a.joblib`, `model_b.joblib`, `thresholds.json`

### 5. Backend Server Execution (FastAPI)
- Launch Python FastAPI backend on port `8000`:
  ```bash
  uvicorn backend.main:app --reload --port 8000
  ```

### 6. Frontend Execution (Next.js)
- Launch Next.js dev server on port `3000`:
  ```bash
  npm --prefix frontend run dev
  ```

---

## Verification Plan

### Automated / Service Checks
- Query `GET http://localhost:8000/api/health` to verify PostGIS database connection and loaded `.joblib` model artifacts.
- Trigger `POST http://localhost:8000/api/predict` for spot `#1` to verify live XGBoost inference and SHAP attribution.

### Manual Verification
- Open `http://localhost:3000` to interact with the real spatial map, dual-model risk scores, drain health rankings, and live dispatches.
