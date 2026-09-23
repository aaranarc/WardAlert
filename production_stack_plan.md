# WardAlert Production Stack Roadmap (PostgreSQL + FastAPI + XGBoost + Next.js)

This document provides a clear, step-by-step technical plan to switch **WardAlert** from the mock Node.js engine (`standalone_api.js`) to the complete real-world production stack using **PostgreSQL/PostGIS**, **Python FastAPI**, real **XGBoost & SHAP ML models**, and the **Next.js Frontend**.

---

## 1. System Architecture Overview

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

## 2. Technical Prerequisites

1. **Docker Desktop**: Required to run the official PostGIS database container (`postgis/postgis:16-3.4`).
2. **Python 3.11 Environment**: For executing FastAPI and the ML pipeline (`xgboost`, `shap`, `scikit-learn`, `geopandas`, `sqlalchemy`).
3. **Node.js (v18+)**: For running the Next.js frontend dashboard.

---

## 3. Step-by-Step Transition Plan

### Step 1: Configure Environment Variables
Copy `.env.example` to `.env` to bind PostgreSQL container credentials, Twilio credentials, and system settings:
```bash
cp .env.example .env
```

### Step 2: Spin Up PostgreSQL / PostGIS Database
Launch the database container defined in `docker-compose.yml`. This automatically initializes PostGIS extensions and executes `database/init.sql` to build real spatial tables:
```bash
docker compose up -d db
```

### Step 3: Ingest Real GIS & Monsoon Datasets into PostGIS
Execute the data loader to populate the database with real datasets:
- **30 BMC Chronic Flooding Spots** (`data/processed/flood_spots_gsouth.csv`)
- **54 OSM Stormwater Drainage Lines** (`data/processed/drainage_gsouth.geojson`)
- **1,096 Days of Daily Rainfall** (`data/processed/rainfall_daily_gsouth.csv`)
- **32 Verified Historical Monsoon Flood Events** (`data/processed/flood_events_gsouth.csv`)

```bash
source .venv/bin/activate
python -m data_loader.ingest
```

### Step 4: Execute ML Model Training & SHAP Explainer
Run the machine learning pipeline to build and serialize production `.joblib` model files:
1. **Model A (Baseline)**: Trained on rainfall series + SRTM elevation (`ml/train_model_a.py`).
2. **Model B (Full Spatial Context)**: Trained on rainfall, elevation, drainage proximity, and citizen reports (`ml/train_model_b.py`).
3. **Decision Thresholds**: Learn critical decision boundaries using Youden J optimization (`ml/learn_thresholds.py`).

```bash
python ml/train_model_a.py
python ml/train_model_b.py
python ml/learn_thresholds.py
```

### Step 5: Launch Python FastAPI Backend
Start the real production backend powered by Uvicorn:
```bash
uvicorn backend.main:app --reload --port 8000
```

### Step 6: Launch Next.js Frontend
Start the Next.js frontend dashboard connected to the FastAPI endpoints:
```bash
npm --prefix frontend run dev
```

---

## 4. Verification & Testing

1. **Backend & PostGIS Health Check**:
   - Query `http://localhost:8000/api/health` to confirm PostGIS database connectivity and verified ML model status.
2. **Dual-Model Inference & SHAP Attribution Verification**:
   - Send `POST /api/predict` for spot `#1` (Elphinstone Bridge / Lower Parel).
   - Ensure `P_rain` (Model A), `P_actual` (Model B), `Δ` (hydraulic delta), and SHAP tree explainer feature importance values are dynamically computed by XGBoost.
3. **Frontend Dashboard Verification**:
   - Access `http://localhost:3000` to verify live OpenStreetMap spot rendering, real risk scores, drain health rankings, and WhatsApp notification dispatching.
