# WardAlert

Hyperlocal flood prediction and civic operations system for **Mumbai Ward G/South**, built on real public data: 30 BMC-identified chronic flooding spots, 54 OSM stormwater drainage segments, 1,096 days of CHIRPS/ERA5 rainfall, and 32 documented flood events.

Built for MUSA CodeX 2026.

---

## 🌐 Live Production Deployment

| Service | Component | URL | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Next.js 14 Dashboard | [https://wardalert-frontend.onrender.com](https://wardalert-frontend.onrender.com) | Live |
| **Backend REST API** | FastAPI + Python 3.11 | [https://wardalert-backend.onrender.com](https://wardalert-backend.onrender.com) | Live |
| **Interactive API Docs** | Swagger / OpenAPI | [https://wardalert-backend.onrender.com/docs](https://wardalert-backend.onrender.com/docs) | Interactive |
| **Cloud Database** | PostgreSQL 16 + PostGIS | Hosted on Supabase (`ap-south-1` Mumbai) | Active |

---

## 1. Quick Start (Turnkey Execution)

The entire system can be run either via the turnkey standalone engine or the full Python FastAPI + PostGIS pipeline.

### Option A: Turnkey Execution (Recommended)

From the root directory:

```bash
# 1. Install frontend dependencies (if not already installed)
npm --prefix frontend install

# 2. Run both the API server (port 8000) and Next.js frontend (port 3000)
npm start
```

Or run them individually in separate terminal sessions:
```bash
npm run api     # Starts API server on http://localhost:8000
npm run dev     # Starts Next.js Dashboard on http://localhost:3000
```

### Option B: Full Python FastAPI + PostGIS Stack

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
docker compose up -d db
uvicorn backend.main:app --reload --port 8000
```

---

## 2. Complete Project Directory Structure & File Map

```
WardAlert/
├── package.json                   # Root scripts (npm start, npm run dev, npm run api)
├── standalone_api.js              # Turnkey zero-dependency server (API, PostGIS math, DB store)
├── config.py                      # Global configuration and environment bindings
├── requirements.txt               # Python package dependencies
├── docker-compose.yml             # PostgreSQL / PostGIS container specification
├── README.md                      # Master project documentation and directory index
│
├── frontend/                      # Next.js 14 Dashboard application
│   ├── package.json               # Frontend dependencies and Next.js scripts
│   ├── tailwind.config.ts         # Tailwind CSS styling configuration
│   ├── tsconfig.json              # TypeScript configuration
│   ├── public/
│   │   └── ward-g-south.geojson   # Ward G/South boundary polygon for cartographic overlay
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Executive Dashboard (/): Live map, KPI cards, dual-model replay
│       │   ├── map/page.tsx       # Live Spatial Map (/map): Interactive OpenStreetMap & spot filters
│       │   ├── drain-health/page.tsx # Drain Health Index (/drain-health): Trend chart & desilting log
│       │   ├── risk-analysis/page.tsx # Risk Analysis (/risk-analysis): Dual model lift & spot ranking
│       │   ├── alerts/page.tsx    # Alerts & Dispatches (/alerts): WhatsApp broadcast & citizen bot
│       │   ├── about/page.tsx     # System Architecture (/about): 12 verified layers & telemetry
│       │   ├── privacy/page.tsx   # DPDP Act 2023 citizen privacy notice
│       │   └── terms/page.tsx     # Municipal operational terms
│       ├── components/
│       │   ├── Dashboard/         # RiskPanel.tsx, DispatchCard.tsx, ConfidenceBadge.tsx, ShapChart.tsx
│       │   ├── Map/               # FloodMap.tsx (Pure OpenStreetMap, Risk Legend, Coordinates), SpotMarker.tsx
│       │   ├── DrainHealth/       # Leaderboard.tsx, TrendChart.tsx (Recharts longitudinal), FailureBadge.tsx
│       │   ├── Alerts/            # AlertLog.tsx, AlertModal.tsx, SingleSendForm.tsx
│       │   ├── Layout/            # Header.tsx, Sidebar.tsx, StatusBar.tsx
│       │   └── Common/            # Icons.tsx (Heroicons & Lucide micro-icons)
│       ├── hooks/
│       │   ├── useSpots.ts        # Spot telemetry and risk cache
│       │   ├── usePredict.ts      # Dual model evaluation hooks
│       │   ├── useDrainHealth.ts  # Longitudinal drain health and detail hooks
│       │   ├── useAlerts.ts       # Broadcast dispatch and audit ledger hooks
│       │   └── useSubscriberCount.ts # Hyperlocal citizen subscriber count hook
│       └── lib/
│           ├── api.ts             # Typed REST API client
│           ├── types.ts           # Core TypeScript definitions (SpotRisk, DrainHealthDetail, etc.)
│           ├── constants.ts       # Risk tier color thresholds and dispatch descriptions
│           └── utils.ts           # Formatting helpers (percentages, dates, classNames)
│
├── data/                          # Spatial GIS datasets and persistent storage
│   ├── raw/
│   │   ├── BMC_Wards.geojson      # Official Mumbai 24-ward administrative boundaries
│   │   └── N19E072.hgt            # NASA SRTM 30-meter digital elevation matrix
│   ├── processed/
│   │   ├── flood_spots_gsouth.csv # 30 BMC-identified chronic waterlogging hotspots
│   │   ├── drainage_gsouth.geojson# 54 stormwater drainage line segments (OSM)
│   │   ├── rainfall_daily_gsouth.csv # 1,096 days of CHIRPS and ERA5 rainfall series
│   │   ├── flood_events_gsouth.csv# 32 verified historical monsoon flood events
│   │   └── ward_gsouth_boundary.geojson # Filtered polygon for Ward G/South
│   └── wardalert_db.json          # Persistent relational JSON database
│
├── ml/                            # Machine learning models and feature pipelines
│   ├── models/
│   │   ├── thresholds.json        # Learned decision boundaries (risk cutoffs, critical delta)
│   │   ├── feature_columns.json   # Exact feature ordering for tree explainers
│   │   ├── model_a.joblib         # Model A: Baseline rainfall-only binary classifier
│   │   └── model_b.joblib         # Model B: Contextual model with drainage and crowd features
│   ├── dataset.py                 # Training snapshot generation (192 positive/negative rows)
│   ├── feature_engineering.py     # Derivation of nearest_drain_m and depression_depth_m
│   ├── label_matching.py          # Ground truth fuzzy verification
│   ├── learn_thresholds.py        # Youden J index and quartile optimization
│   ├── train_model_a.py           # Rainfall baseline training
│   ├── train_model_b.py           # Full context model training
│   ├── shap_explainer.py          # SHAP tree explainer feature importance
│   └── confidence.py              # Bayesian Beta posterior credible intervals
│
├── backend/                       # Python FastAPI backend services
│   ├── main.py                    # FastAPI application initialization and CORS setup
│   ├── routers/                   # API endpoint routers (predict, drain_health, alerts)
│   ├── services/                  # Business logic (model evaluation, SHAP, notifications)
│   └── utils/                     # Cryptographic phone hashing and spatial geometry math
│
├── whatsapp_templates/            # Multilingual civic broadcast templates
│   ├── alert_en.txt               # English BMC emergency broadcast template
│   ├── alert_hi.txt               # Hindi localized template
│   ├── alert_hinglish.txt         # Hinglish colloquial template
│   └── alert_mr.txt               # Marathi official administrative template
│
└── docs/                          # Comprehensive technical documentation
    ├── architecture.md            # 5-layer system pipeline and mathematical model
    ├── api_reference.md           # API endpoints, request schemas, and responses
    ├── data_provenance.md         # Detailed inventory of real vs. modeled data
    ├── feature_status.md          # Implementation disclosure and verification audit
    ├── verification_run.md        # End-to-end operational test log
    └── whatsapp_alert_spec.md     # Two-way citizen WhatsApp bot and dispatch specification
```

---

## 3. The Core Concept: Dual Model Residual

Rainfall alone does not explain why Mumbai floods unevenly. Two spots one kilometer apart under the same cloudburst behave differently when one has a clogged drainage segment.

WardAlert trains **two** models on the same data:

| Model | Input Feature Set | Predicts |
| :--- | :--- | :--- |
| **Model A** | Rainfall series + SRTM elevation only | `P_rain` (Hydrometeorological Baseline) |
| **Model B** | Rainfall, elevation, drainage proximity, crowd reports | `P_actual` (Full Spatial Context) |

The difference between them represents localized hydraulic failure:

```
Delta = P_actual - P_rain
```

- When Delta is near zero or negative: Flooding is purely rainfall driven. Action: Position mobile dewatering pumps and deploy traffic marshals.
- When Delta is positive: The flood risk is driven by blocked drainage rather than rainfall volume alone. Action: Dispatch emergency desilting crews to clear silt choke points.

---

## 4. Key Endpoints

- `GET /api/health` -> System health, database status, and loaded models
- `GET /api/spots` -> 30 chronic spots with live risk levels and coordinates
- `POST /api/predict` -> Evaluates dual models for an individual spot
- `POST /api/predict/all` -> Recalculates all 30 spots (supports `{ timestamp: "2025-07-15T10:30:00Z" }` for 2025 monsoon cloudburst replay)
- `GET /api/drain-health` -> Maintenance leaderboard sorted by health score
- `GET /api/drain-health/:id` -> Longitudinal time series with weekly observation points
- `POST /api/drain-health/:id/desilt` -> Logs municipal desilting service and restores health score to 94.5%
- `POST /api/alert/broadcast/:spot_id` -> Outbound broadcast to spot subscribers or 2.0 km critical radius
- `POST /api/whatsapp/webhook` -> Inbound citizen bot webhook (location pins, STATUS, EXTEND, STOP)
