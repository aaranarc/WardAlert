# WardAlert — Complete Project Context & Architecture Guide

> **Purpose of this document:** This is a comprehensive, self-contained technical and conceptual brief for **WardAlert**. Any developer or AI coding agent can read this single document to immediately understand the entire problem statement, mathematical methodology, codebase layout, database schema, ML models, API contracts, frontend architecture, and run instructions.

---

## Table of Contents
1. [Executive Summary & Core Concept](#1-executive-summary--core-concept)
2. [The Mathematical Formulation (Dual-Model Residual)](#2-the-mathematical-formulation-dual-model-residual)
3. [Full Project Directory Structure](#3-full-project-directory-structure)
4. [Data & Provenance](#4-data--provenance)
5. [Database Architecture & Schema](#5-database-architecture--schema)
6. [Machine Learning Pipeline](#6-machine-learning-pipeline)
7. [Backend Architecture & API Contract](#7-backend-architecture--api-contract)
8. [Frontend Architecture & UI Systems](#8-frontend-architecture--ui-systems)
9. [WhatsApp Webhook & Subscriber Flow](#9-whatsapp-webhook--subscriber-flow)
10. [End-to-End Setup & Run Order](#10-end-to-end-setup--run-order)
11. [How to Demo & Honest Engineering Limitations](#11-how-to-demo--honest-engineering-limitations)

---

## 1. Executive Summary & Core Concept

**WardAlert** is a hyperlocal flood and drainage failure prediction platform custom-built for **Mumbai Ward G/South** (encompassing chronic flood hotspots such as Hindmata Junction, Gandhi Market, Parel TT, Worli Naka, and Mahalaxmi).

### The Problem
Rainfall alone does not explain where and why Mumbai floods:
- Two locations separated by less than 1 km under the exact same torrential cloudburst often exhibit completely different flood outcomes.
- One spot drains cleanly because stormwater drains are clear; the other floods knee-deep because local stormwater drainage networks are silted, blocked, or experiencing hydraulic backflow.

### The Innovation
Instead of training a single classification model to predict flooding from rain + terrain, WardAlert trains **two models on identical historical data**:
1. **Model A (Meteorological & Physical Baseline):** Trained strictly on rainfall intensity and static terrain elevation.
2. **Model B (Context-Aware Physical & Infrastructure Model):** Trained on full spatial context, including proximity to stormwater drains, depression depth, and citizen crowd signals.

The difference between their predicted probabilities ($\Delta$) isolates **unexplained flood risk** — the direct mathematical signature of **drainage failure and siltation**.

---

## 2. The Mathematical Formulation (Dual-Model Residual)

$$\Delta = P_{\text{actual}} - P_{\text{rain}}$$

Where:
- $P_{\text{rain}} \in [0, 1]$: Output of **Model A** (flood risk attributable strictly to meteorological rainfall).
- $P_{\text{actual}} \in [0, 1]$: Output of **Model B** (actual expected flood probability given local infrastructure context).
- $\Delta \in [-1, 1]$: The residual gap.

### What $\Delta$ Accomplishes:
1. **Differentiated Emergency Dispatch:**
   - $\Delta \le \text{Threshold}$ $\rightarrow$ **Rainfall Driven**: Deploy mobile dewatering suction pumps and traffic marshals.
   - $\Delta > \text{Threshold}$ $\rightarrow$ **Drainage Failure**: Deploy emergency drain desilting and excavation crews.
2. **SHAP Feature Attribution:** Per-prediction TreeSHAP values identify the top 3 drivers raising or lowering flood probability with exact attribution values.
3. **Bayesian Uncertainty Quantification:** Uses a Beta posterior credible interval $[CI_{\text{lower}}, CI_{\text{upper}}]$ to make model uncertainty transparent on compact positive datasets.
4. **Predictive Drain Health Index:** Weekly average $\Delta$ is tracked longitudinally over 53 weeks per spot. A linear regression ($y = mt + c$) extrapolates when $\Delta$ will intersect the learned `critical_delta`, calculating a **predicted failure date** to schedule desilting *weeks before* a flood occurs.

---

## 3. Full Project Directory Structure

```text
WardAlert/
├── .env.example                 # Documented environment configuration template
├── .gitignore                   # Ignores .venv, node_modules, .next, __pycache__, *.joblib
├── README.md                    # Project overview and quickstart
├── PROJECT_CONTEXT.md           # [THIS FILE] Complete context for new chats / developers
├── config.py                    # Global configuration reading from environment
├── docker-compose.yml           # PostGIS PostgreSQL database service
├── requirements.txt             # Python dependencies (FastAPI, XGBoost, GeoPandas, etc.)
│
├── database/
│   └── init.sql                 # Complete PostGIS DDL, 10 tables + v_latest_risk view
│
├── data/
│   ├── raw/                     # Original CSVs, SRTM raster, OSM drainage GeoJSON
│   └── processed/               # Cleaned datasets and ward_gsouth_boundary.geojson
│
├── data_loader/
│   ├── db.py                    # Synchronous psycopg2 helper for idempotent loading
│   ├── fuzzy.py                 # Fuzzy string matching for historical event location names
│   ├── load_flood_spots.py      # Loads 30 chronic spots into PostGIS
│   ├── load_drainage.py         # Loads 54 OSM drainage line segments
│   ├── load_rainfall.py         # Loads 1,096 days of daily CHIRPS/ERA5 rainfall
│   ├── load_flood_events.py     # Loads 32 documented historical flood events
│   ├── load_ward_boundary.py    # Loads Ward G-South GeoJSON boundary
│   ├── compute_spatial_features.py # Derives nearest_drain_m & depression_depth_m
│   ├── seed_subscribers.py      # Seeds realistic test subscribers
│   └── main.py                  # Single CLI runner executing all loaders idempotently
│
├── ml/
│   ├── dataset.py               # Train/validation/test split utilities
│   ├── feature_engineering.py   # Synthesizes 192 training snapshots (32 pos, 160 neg)
│   ├── label_matching.py        # Validates 32/32 event matches to physical spots
│   ├── train_model_a.py         # Trains Model A baseline XGBoost (rain only)
│   ├── train_model_b.py         # Trains Model B full-context XGBoost (must beat A)
│   ├── learn_thresholds.py      # Computes Youden's J, quartiles, and critical Δ
│   ├── confidence.py            # Beta posterior credible interval calculations
│   ├── shap_explainer.py        # TreeSHAP explainer for top-3 feature attribution
│   ├── predict.py               # Unified Predictor engine running both models
│   ├── metrics.py               # Precision, Recall, F1, ROC-AUC evaluations
│   └── models/
│       ├── feature_columns.json # Exact feature list expected by XGBoost models
│       └── thresholds.json      # Learned operating thresholds (Youden's J, risk quartiles)
│
├── drain_health/
│   ├── compute_weekly_delta.py  # Aggregates 4,650 predictions into 1,590 weekly Δ rows
│   ├── fit_trend.py             # Linear regression per spot (slope, intercept)
│   ├── predict_failure_date.py  # Extrapolates slope to critical_delta threshold
│   └── main.py                  # Builds and updates the drain health index
│
├── backend/
│   ├── main.py                  # FastAPI app entry point with lifespan model loading
│   ├── db.py                    # Async SQLAlchemy engine + sessionmaker (asyncpg)
│   ├── deps.py                  # Dependency injection for Predictor and AsyncSession
│   ├── models/                  # SQLAlchemy ORM models matching database/init.sql
│   │   ├── base.py
│   │   ├── flood_spot.py
│   │   ├── drainage_segment.py
│   │   ├── rainfall_daily.py
│   │   ├── flood_event.py
│   │   ├── feature_snapshot.py
│   │   ├── prediction.py
│   │   ├── drain_health_weekly.py
│   │   ├── crowd_report.py
│   │   ├── alert_sent.py
│   │   ├── subscriber.py
│   │   └── ward_boundary.py
│   ├── schemas/                 # Pydantic v2 validation models for all requests/responses
│   ├── services/
│   │   ├── prediction_service.py # Runs prediction & persists history
│   │   ├── drain_health_service.py # Leaderboard & trend queries
│   │   ├── whatsapp_service.py   # Message formatting & Twilio integration
│   │   ├── crowd_match_service.py # Snaps reports to nearest spot via PostGIS
│   │   └── subscriber_service.py # SHA-256 hashed subscriber lifecycle
│   └── routers/
│       ├── health.py            # GET /api/health
│       ├── spots.py             # GET /api/spots and GET /api/spots/{id}
│       ├── predict.py           # POST /api/predict and POST /api/predict/all
│       ├── drain_health.py      # GET /api/drain-health and GET /api/drain-health/{id}
│       ├── alerts.py            # POST /api/alert/send, POST /api/alert/broadcast/{id}
│       ├── crowd_reports.py     # POST /api/crowd-report and GET /api/crowd-reports
│       └── whatsapp.py          # POST /api/whatsapp/webhook (TwiML inbound handler)
│
├── whatsapp_templates/
│   ├── alert_en.txt             # English WhatsApp alert template
│   ├── alert_hi.txt             # Hindi (हिंदी) template
│   ├── alert_hinglish.txt       # Hinglish template
│   └── alert_mr.txt             # Marathi (मराठी) template
│
├── tests/
│   └── test_subscribers.py      # End-to-end subscriber and webhook test suite
│
├── docs/
│   ├── architecture.md          # 5-layer pipeline architecture
│   ├── api_reference.md         # Full documentation of all 11 endpoints
│   ├── data_provenance.md       # Detailed breakdown of real vs derived data
│   ├── feature_status.md        # Feature matrix (working / simulation / planned)
│   ├── verification_run.md      # Recorded end-to-end verification output
│   └── screenshots/             # UI screenshots for all 4 frontend views
│
└── frontend/                    # Next.js 14 App Router dashboard
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.js
    ├── .env.local.example       # NEXT_PUBLIC_API_URL=http://localhost:8000
    ├── public/
    │   └── ward-g-south.geojson # Ward G-South polygon boundary
    └── src/
        ├── app/
        │   ├── layout.tsx       # Dark shell with collapsible sidebar & header
        │   ├── page.tsx         # Dashboard — interactive Leaflet map
        │   ├── drain-health/page.tsx # Drain leaderboard & longitudinal trend chart
        │   ├── alerts/page.tsx  # WhatsApp test form, broadcast UI & audit log
        │   └── about/page.tsx   # Architecture & feature status matrix
        ├── components/
        │   ├── Map/             # Leaflet FloodMap, SpotMarker, WardBoundary
        │   ├── Dashboard/       # RiskPanel, ShapChart, DispatchCard, ConfidenceBadge
        │   ├── DrainHealth/     # Leaderboard, TrendChart, FailureBadge
        │   ├── Alerts/          # AlertLog, MessagePreviewModal
        │   └── Layout/          # Header, Sidebar, StatusBar
        ├── hooks/               # SWR hooks (useSpots, useSpot, usePredict, useDrainHealth, etc.)
        └── lib/                 # api.ts (typed fetcher), types.ts, constants.ts, utils.ts
```

---

## 4. Data & Provenance

WardAlert runs on real municipal and geospatial datasets for Mumbai Ward G-South:

| Dataset | Real Count | Source & Details |
|---|---|---|
| **Flood Spots** | 30 spots | BMC-identified chronic waterlogging locations with coordinates |
| **Drainage Segments** | 54 lines | OpenStreetMap (OSM) major stormwater lines & open channels |
| **Rainfall History** | 1,096 days | Daily CHIRPS / ERA5 precipitation reanalysis (2023–2025) |
| **Flood Events** | 32 events | Documented BMC / news flood events with exact dates and locations |
| **Elevation Raster** | 1 arc-sec | NASA SRTM 30m Digital Elevation Model |
| **Ward Boundary** | 1 polygon | Official BMC Ward G-South spatial polygon boundary |

### Derived Spatial Features (Calculated during Data Load)
- `nearest_drain_m`: PostGIS spherical distance `ST_Distance(spot.geom, drain.geom)` (ranges 22.8m to 1,702.2m).
- `depression_depth_m`: Elevation difference between the local spot and the 90th percentile rim elevation of its 250m neighborhood (ranges 0.0m to 18.8m).

---

## 5. Database Architecture & Schema

The database runs **PostgreSQL with the PostGIS extension enabled**.

### Key Tables (`database/init.sql`)
1. `flood_spots`: 30 chronic spots (`id, name, lat, lng, geom, elevation_m, depression_depth_m, nearest_drain_m, notes`).
2. `drainage_segments`: 54 stormwater line geometries (`id, osm_id, name, drain_type, geom`).
3. `rainfall_daily`: 1,096 daily rainfall records (`date, rain_mm`).
4. `flood_events`: 32 documented historical events matched to spot IDs.
5. `feature_snapshots`: 192 engineered feature snapshots for ML training (32 positive, 160 sampled negative timestamps).
6. `predictions`: Prediction logs (`spot_id, predicted_for, p_rain, p_actual, delta, risk_level, cause_label, dispatch_type, confidence_lower, confidence_upper, shap_top3`).
7. `drain_health_weekly`: 1,590 weekly aggregated rows (`spot_id, year, week_number, avg_delta, max_delta, prediction_count, health_score`).
8. `subscribers`: Citizen subscriptions (`phone_hash VARCHAR(64) PRIMARY KEY, spot_id, language, subscribed_at, expires_at`). **Zero plain-text phone numbers are ever stored in the database.**
9. `alerts_sent`: Outbound transmission audit log (`id, spot_id, spot_name, prediction_id, language, recipient, channel, status, body, sent_at`).
10. `crowd_reports`: Citizen flood reports (`id, lat, lng, severity, note, spot_id, distance_m, matched, reported_at`).

### The Real-Time Map View: `v_latest_risk`
A PostgreSQL `VIEW` performing a `LEFT JOIN` between `flood_spots` and the most recent entry for each spot in `predictions`. This ensures all 30 spots always render on the map immediately with their latest state.

---

## 6. Machine Learning Pipeline

### Models & Feature Engineering
- **Model A (Rain-only Baseline):** Features = `rain_1h, rain_3h, rain_6h, rain_24h, rain_72h, elevation_m`. Test AUC: **0.8187**.
- **Model B (Full Infrastructure Context):** Features = Model A features + `nearest_drain_m, depression_depth_m, crowd_reports_500m_2h`. Test AUC: **0.8500**, F1: **0.50** (vs Model A's 0.29).
- **Rule:** Model B must strictly outperform Model A on test AUC by $\ge +0.02$; training aborts automatically if this condition is not met.

### Learned Operating Thresholds (`ml/models/thresholds.json`)
No thresholds are hardcoded or guessed; all are learned from the distribution:
- **`dispatch_threshold` (Youden's J):** Cutoff on $\Delta$ separating rainfall-driven flooding from drainage failure ($J = 0.269$).
- **`risk_quartiles`:** `low` ($< p_{25}$), `moderate` ($p_{25} - p_{50}$), `high` ($p_{50} - p_{75}$), `critical` ($\ge p_{75}$).
- **`critical_delta`:** 90th percentile of $\Delta$ across Ward G-South, representing the physical failure boundary.

---

## 7. Backend Architecture & API Contract

FastAPI with asynchronous SQLAlchemy (`asyncpg`) and Pydantic v2 schemas.

### Primary Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck (verifies DB connection, loaded XGBoost models, and version) |
| `GET` | `/api/spots` | Returns all 30 spots with their latest prediction from `v_latest_risk` |
| `GET` | `/api/spots/{id}` | Returns spot detail + 24-hour prediction history series |
| `POST` | `/api/predict` | Runs Model A, Model B, SHAP, and Credible Interval on demand for a spot |
| `POST` | `/api/predict/all` | Runs batch prediction across all 30 spots |
| `GET` | `/api/drain-health` | Standings leaderboard sorted by health score (worst first) |
| `GET` | `/api/drain-health/{id}`| Longitudinal weekly points, trend slope, and predicted failure date |
| `POST` | `/api/alert/send` | Generates localized alert (en, hi, hinglish, mr) and logs to `alerts_sent` |
| `POST` | `/api/alert/broadcast/{id}`| Dispatches alert to all active subscribers of a spot |
| `GET` | `/api/alerts/log` | Returns real-time audit log of all generated alerts |
| `POST` | `/api/crowd-report` | Accepts citizen report and snaps to nearest spot within 500m |
| `POST` | `/api/whatsapp/webhook` | Inbound Twilio webhook handling citizen WhatsApp messages |

---

## 8. Frontend Architecture & UI Systems

Built in `frontend/` using **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Leaflet**, and **Recharts**.

### Styling & Theme Tokens
- **Background:** Dark mode default (`#0a0a0f`) with glassmorphism panels (`#12122b`, border `rgba(123, 104, 238, 0.25)`).
- **Primary Accent:** Electric Purple (`#7B68EE`) and Light Violet (`#b8a9ff`).
- **Risk Colors:** `low` = `#4ade80`, `moderate` = `#facc15`, `high` = `#fb923c`, `critical` = `#ef4444`.
- **Map Tiles:** Stadia Maps Dark (`https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png`).

### Key Views
1. **Live Flood Map (`/`):** Leaflet map with 30 spot markers, search filter, risk quartile pills, live re-predict button, and slide-in **RiskPanel** (420px) showing SHAP bars, Bayesian confidence interval, and dispatch directive.
2. **Drain Health (`/drain-health`):** Summary stats, sortable Leaderboard table, and weekly $\Delta$ trend chart with linear regression fit and failure horizon marker.
3. **Alerts Center (`/alerts`):** Multilingual test-send form, recipient input, live WhatsApp preview bubble modal, and audit log table.
4. **About & Architecture (`/about`):** Full technical documentation and interactive feature status matrices.

---

## 9. WhatsApp Webhook & Subscriber Flow

### Privacy-First Architecture
When a citizen texts the system, their phone number is immediately converted to a one-way **SHA-256 hash** (`hash_phone(From)`). The database stores only `phone_hash`.

### Citizen WhatsApp Interactive Commands (`POST /api/whatsapp/webhook`)
1. **Share Location (Pin drop / GPS):** Snaps coordinates via PostGIS to nearest flood spot, creates a **7-day subscription**, and immediately replies with current localized flood risk.
2. **`STATUS`:** Checks current flood risk at the user's subscribed spot.
3. **`hindi` / `marathi` / `hinglish` / `english`:** Updates language preference for all future alerts.
4. **`EXTEND`:** Extends active subscription by another 7 days.
5. **`STOP`:** Deletes the subscription record.

*Note: Without active Twilio credentials, outbound alerts seamlessly execute in `simulated` mode, logging to the database and rendering in the frontend preview modal.*

---

## 10. End-to-End Setup & Run Order

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Docker (for PostgreSQL / PostGIS)

### Step 1: Clone & Configure Environment
```bash
git clone https://github.com/aaranarc/WardAlert.git
cd WardAlert

# Create Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create .env
cp .env.example .env
```

### Step 2: Launch PostGIS Database
```bash
docker compose up -d db
# Verify container is healthy
docker logs wardalert-db-1 | tail -5
```

### Step 3: Run the Pipeline (Idempotent)
```bash
python -m data_loader.main       # Load spots, drains, rainfall, events, boundary + compute spatial features
python -m ml.label_matching      # Confirm 32/32 event matches
python -m ml.feature_engineering # Synthesize 192 training snapshots
python -m ml.train_model_a       # Train rain baseline model
python -m ml.train_model_b       # Train full-context model (must beat A)
python -m ml.learn_thresholds    # Compute Youden's J, quartiles, critical delta
python -m drain_health.main      # Generate 53-week history and fit trend lines
```

### Step 4: Run Backend
```bash
python -m uvicorn backend.main:app --reload --port 8000
# Health check: curl http://localhost:8000/api/health
```

### Step 5: Run Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# Open http://localhost:3000
```

---

## 11. How to Demo & Honest Engineering Limitations

### 💡 Key Demo Tip: The 2025 Monsoon Flood Moment
Historical rainfall reanalysis ends on **31 Dec 2025**. Running a prediction for "today" will see `rain = 0` (returning low risk).
- **To demo extreme flooding and drainage failure:** Replay the recorded monsoon cloudburst at Hindmata Junction:
  - **Spot ID:** `1` (Hindmata Junction)
  - **Timestamp:** `2025-07-15T10:30:00Z`
  - **Result:** Returns $P_{\text{actual}} = 0.92$, `critical` risk, cause = `drainage_failure`, and recommended dispatch = `desilting_crew`.
  - In the UI, click the **"Replay 2025 Monsoon Flood"** button on the dashboard or inside the RiskPanel.

### Honest Limitations
1. **Compact positive event dataset (32 documented floods):** Addressed by Bayesian Beta posterior credible intervals surfaced directly in the UI.
2. **Drain health is validated on methodology, not physical sewer telemetry:** Fitted on model residual output ($\Delta$) rather than physical sonar/CCTV pipe inspections.
3. **Crowd reports feature is inert without live webhook traffic:** Fully wired into Model B and PostGIS matching, but historical training rows set this feature to 0 until citizen reports arrive.
