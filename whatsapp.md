# WardAlert: Municipal Flood Warning & WhatsApp Alert System
**Complete System Prompt, Implementation Blueprint, Architecture & File Structure**

---

## 1. Executive Summary & Core Concept

**WardAlert** is a municipal flood dispatch and cause-attribution system built for the **Brihanmumbai Municipal Corporation (BMC)** disaster management cell in **Mumbai Ward G-South** (covering Worli, Lower Parel, Prabhadevi, Mahalaxmi, and Currey Road).

Rather than treating urban flooding as purely a rainfall phenomenon, WardAlert operates on a **Dual-Model Residual Formulation**:
$$\Delta = P_{\text{actual}} - P_{\text{rain}}$$

* **Model A (Baseline - Rain & Topography)**: Predicts probability of waterlogging ($P_{\text{rain}}$) based strictly on meteorological precipitation ($1\text{h}, 3\text{h}, 24\text{h}$) and terrain geometry (elevation, depression depth).
* **Model B (Full Context - Drainage & Human Feedback)**: Predicts total risk ($P_{\text{actual}}$) incorporating drainage network proximity, longitudinal siltation health scores, and citizen crowd reports.
* **Residual Gap ($\Delta$)**:
  * **Rainfall-Driven** ($\Delta \le \Delta_{\text{crit}}$): Rain overwhelms physical drainage capacity $\rightarrow$ Dispatch high-capacity dewatering pump trucks and traffic marshals.
  * **Drainage-Failure Driven** ($\Delta > \Delta_{\text{crit}}$): Flood risk is drastically higher than rainfall alone can explain, identifying culvert choke points, illegal trash dumping, or extreme siltation $\rightarrow$ Dispatch emergency desilting crews with suction tankers.

---

## 2. WhatsApp Alert & Citizen Dispatch System (Detailed Specification)

### 2.1 Technical Stack & Components
* **Messaging API**: Twilio Programmable Messaging API (WhatsApp Sandbox + SMS fallback).
* **Backend Framework**: FastAPI (Python 3.11+ async endpoints).
* **Database & Spatial Engine**: PostgreSQL 16 + PostGIS (`ST_DWithin`, `ST_Distance`, `ST_SetSRID`, `ST_MakePoint`, `geography`).
* **Privacy Engine**: SHA-256 Phone Number Hashing (`phone_hash`). Raw E.164 numbers are never stored in the database.
* **Template Engine**: Localized `.format()` string templates in 4 languages: English (`en`), Hindi (`hi`), Hinglish (`hinglish`), and Marathi (`mr`).
* **Delivery Engine**: Hybrid Live/Simulated mode:
  * If `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are present $\rightarrow$ delivers actual WhatsApp messages via Twilio REST client.
  * If Twilio credentials are unset or running in local dev/demo $\rightarrow$ executes all composition and business logic, logs delivery with `status='simulated'`, and never marks as `failed`.

---

### 2.2 Inbound Citizen Flow (`POST /api/whatsapp/webhook`)

Citizens interact directly with the WardAlert WhatsApp bot without requiring mobile app installation:

```
                  ┌──────────────────────────────┐
                  │ Citizen sends WhatsApp Msg   │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │ Twilio Webhook                │
                 │ POST /api/whatsapp/webhook    │
                 └───────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  [Location Pin]          [Keyword: STATUS]       [Keyword: EXTEND/STOP]
         │                       │                       │
Find nearest flood spot   Fetch active spot       EXTEND: +7 days renewal
via PostGIS ST_Distance   Run dual-model ML       STOP: Delete subscriber
Subscribe phone_hash      Generate P_actual & Δ   Return confirmation
Send localized alert      Send status reply       
```

#### A. Location Sharing (One-Click Onboarding)
* When a citizen shares their live location pin via WhatsApp (`Latitude`, `Longitude` in form payload):
  1. Calculates nearest chronic flood spot via PostGIS:
     ```sql
     SELECT id, name FROM flood_spots
     ORDER BY ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)
     LIMIT 1;
     ```
  2. Creates or updates subscription for `phone_hash` with `expires_at = NOW() + INTERVAL '7 days'`.
  3. Immediately runs dual-model prediction for that spot.
  4. Returns localized TwiML message containing current flood risk, probability, rain intensity, and safety guidance.

#### B. Keyword Commands
* **`STATUS`**: Queries current subscription. If active, runs real-time dual-model inference for their spot and replies with latest risk score, cause, and rain telemetry.
* **`EXTEND`**: Renews subscription for another 7 days.
* **`STOP`**: Immediately unregisters the citizen and removes their `phone_hash` from the `subscribers` table.
* **Language Switching**: Mentioning language keywords (`"hindi"`, `"हिंदी"`, `"hinglish"`, `"marathi"`, `"मराठी"`) automatically sets preferred language for all future alerts.

---

### 2.3 Outbound Municipal Broadcast Flow (`POST /api/alert/broadcast/{spot_id}`)

Ward officers initiate broadcasts from the Emergency Alert Center (`/alerts`):

| Mode | Channels | Recipient Scope | Spatial Query |
| :--- | :--- | :--- | :--- |
| **NORMAL BROADCAST** | WhatsApp | Registered subscribers of the target flood spot | `WHERE spot_id = :spot_id AND expires_at > NOW()` |
| **CRITICAL EMERGENCY** | WhatsApp + SMS | All active subscribers within `CRITICAL_RADIUS_KM` (2 km) | `ST_DWithin(s.geom::geography, target.geom::geography, 2000)` |

#### Broadcast Response Payload
```json
{
  "broadcast_count": 42,
  "mode": "critical",
  "channels": ["whatsapp", "sms"],
  "message": "Broadcasted to 42 subscribers via WhatsApp + SMS (within 2.0km radius)"
}
```

---

### 2.4 Multilingual Template Engine & Localization

Templates are stored under `whatsapp_templates/`:
* `alert_en.txt` (English)
* `alert_hi.txt` (Hindi)
* `alert_hinglish.txt` (Hinglish)
* `alert_mr.txt` (Marathi)

#### Template Dynamic Placeholders
* `{spot_name}`: Location (e.g. *Hindmata Junction*)
* `{risk_level}`: Localized risk tier (*CRITICAL / गंभीर / HIGH / MODERATE*)
* `{cause_label}`: Diagnosed cause (*drain blockage / नाली में रुकावट / heavy rainfall*)
* `{p_actual_pct}`: Computed probability percentage (e.g. *88%*)
* `{rain_3h}`: Cumulative 3-hour rainfall in mm (e.g. *64.2 mm*)
* `{updated_ago}`: Dynamic time delta in localized language (*just now, 5m ago, आत्ताच, अभी, abhi*)
* `{dispatch_action}`: Operational directive (*desilting crew requested / pump trucks on standby*)

#### Example Rendered Alert (English)
```text
🚨 BMC WARD G-SOUTH FLOOD ALERT 🚨

Location: Hindmata Junction
Risk Level: CRITICAL (88% probability)
Cause: drain blockage
3h Rainfall: 64.2 mm (updated just now)

Action: desilting crew requested — avoid the stretch

Reply STATUS for latest update
Reply EXTEND to keep receiving alerts
Reply STOP to unsubscribe
```

---

### 2.5 Database Schema for Subscriptions & Alerts

```sql
-- Anonymous citizen subscriptions
CREATE TABLE subscribers (
    id SERIAL PRIMARY KEY,
    phone_hash VARCHAR(64) UNIQUE NOT NULL,
    spot_id INT REFERENCES flood_spots(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_subscribers_spot ON subscribers(spot_id);
CREATE INDEX idx_subscribers_active ON subscribers(expires_at);

-- Immutable audit log for all outbound alerts
CREATE TABLE alerts_sent (
    id SERIAL PRIMARY KEY,
    spot_id INT REFERENCES flood_spots(id),
    prediction_id INT REFERENCES predictions(id),
    language VARCHAR(10) NOT NULL,
    recipient VARCHAR(64) NOT NULL, -- phone_hash or E.164
    channel VARCHAR(20) DEFAULT 'whatsapp', -- 'whatsapp' | 'sms'
    status VARCHAR(20) NOT NULL, -- 'sent' | 'simulated' | 'failed'
    provider_sid VARCHAR(64),
    error TEXT,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_alerts_sent_spot ON alerts_sent(spot_id);
CREATE INDEX idx_alerts_sent_time ON alerts_sent(sent_at DESC);
```

---

### 2.6 How to Set Up & Run the WhatsApp System

#### 1. Environment Configuration (`.env`)
```bash
# PostgreSQL + PostGIS Connection
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/wardalert
SYNC_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wardalert

# Twilio Credentials (Optional for local dev, Required for live outbound)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ALERT_DEFAULT_RECIPIENT=whatsapp:+919876543210
CRITICAL_RADIUS_KM=2.0
```

#### 2. Twilio WhatsApp Sandbox Setup
1. In Twilio Console, go to **Messaging** $\rightarrow$ **Try it out** $\rightarrow$ **Send a WhatsApp message**.
2. Connect your mobile device by sending the sandbox code (e.g. `join <sandbox-code>`) to `+1 415 523 8886`.
3. Set the Sandbox Inbound Webhook URL:
   * Run local tunnel: `ngrok http 8000`
   * In Twilio Sandbox Settings, paste:
     `https://<your-ngrok-subdomain>.ngrok-free.app/api/whatsapp/webhook`
   * Method: `HTTP POST`

#### 3. Testing WhatsApp Inbound Flows
* **Send Location**: Tap the attach icon in WhatsApp $\rightarrow$ Location $\rightarrow$ Send current location. The bot identifies the nearest spot, subscribes your number for 7 days, and responds with live flood risk.
* **Send `STATUS`**: Receive live prediction, probability, and cause attribution.
* **Send `EXTEND`**: Extends active subscription by another 7 days.
* **Send `STOP`**: Unsubscribes immediately.

---

## 3. Project Architecture

```
                      ┌─────────────────────────────────┐
                      │    CIVIC OPERATIONS DASHBOARD   │
                      │        Next.js 14 (App Router)  │
                      └────────────────┬────────────────┘
                                       │ REST / SWR
                                       ▼
                      ┌─────────────────────────────────┐
                      │        FASTAPI BACKEND          │
                      │     Uvicorn Asynchronous Core   │
                      └────────┬───────────────┬────────┘
                               │               │
            ┌──────────────────┴──┐         ┌──┴──────────────────┐
            ▼                     ▼         ▼                     ▼
     [Predict Engine]     [Alert Service] [Drain Health]   [Spatial Queries]
     Model A (P_rain)     WhatsApp/Twilio  Regression Fits  PostGIS ST_Within
     Model B (P_actual)   Multilingual     Linear Extrap    ST_Distance
     Residual Δ           Audit Logging    Failure Dates    Ward Boundaries
            │                     │         │                     │
            └─────────────────────┼─────────┴─────────────────────┘
                                  ▼
                      ┌─────────────────────────────────┐
                      │      POSTGRESQL 16 + POSTGIS    │
                      │   10 Tables + v_latest_risk     │
                      └─────────────────────────────────┘
```

### 3.1 The Machine Learning Pipeline
1. **Model A (Baseline XGBoost)**: Trained on `rain_1h`, `rain_3h`, `rain_24h`, `elevation_m`, `depression_depth_m`. Output: $P_{\text{rain}} \in [0, 1]$.
2. **Model B (Contextual XGBoost)**: Trained on Model A features plus `drain_distance_m`, `monsoon_week`, `hour_of_day`, and `crowd_reports_500m_2h`. Output: $P_{\text{actual}} \in [0, 1]$.
3. **Residual Delta Attributor**:
   $$\Delta = P_{\text{actual}} - P_{\text{rain}}$$
   Thresholds derived from Youden's $J$ statistic and training set percentiles:
   * $\Delta \ge 0.180 \rightarrow$ Drainage Failure (Action: Desilting Crew)
   * $\Delta < 0.180 \rightarrow$ Rainfall Driven (Action: Pumps & Traffic)
4. **TreeSHAP Attributor**: Extracts top 3 feature drivers with direction and exact numerical contribution per inference.
5. **Bayesian Uncertainty**: Calculates 95% credible intervals $[L, U]$ using Beta posterior distribution.

---

## 4. Complete Project File Structure

```
WardAlert/
├── PROJECT_CONTEXT.md                # Full system architecture and engineering guide
├── README.md                         # Quickstart setup and repository overview
├── whatsapp.md                       # Complete WhatsApp alert & project documentation (This file)
├── config.py                         # Unified process configuration & environment parsing
├── docker-compose.yml                # Docker compose file for PostgreSQL 16 + PostGIS
├── requirements.txt                  # Python dependencies
│
├── database/
│   └── init.sql                      # PostGIS DDL schema (10 tables, indexes, v_latest_risk view)
│
├── data/
│   ├── raw/
│   │   ├── BMC_Wards.geojson         # Complete administrative boundary GeoJSON for Mumbai
│   │   └── N19E072.hgt               # NASA SRTM 1-arcsecond digital elevation raster
│   └── processed/
│       ├── ward_gsouth_boundary.geojson # Filtered boundary polygon for Ward G-South
│       ├── flood_spots_gsouth.csv    # 30 BMC-identified chronic waterlogging locations
│       ├── drainage_gsouth.geojson   # 54 major stormwater drainage line segments
│       ├── rainfall_daily_gsouth.csv # 1,096 days of ERA5/CHIRPS historical rainfall
│       └── flood_events_gsouth.csv   # 32 ground-truth flood disaster incident ground truths
│
├── data_loader/
│   ├── db.py                         # Synchronous psycopg2 connection pool
│   ├── fuzzy.py                      # RapidFuzz string matching for news/incident locations
│   ├── load_ward_boundary.py         # Ingests ward boundary polygon into PostGIS
│   ├── load_flood_spots.py           # Ingests 30 flood spots with PostGIS ST_Within validator
│   ├── load_drainage.py              # Ingests stormwater drain lines with Multilinestring geometry
│   ├── load_rainfall.py              # Ingests 3-year historical rainfall time series
│   ├── load_flood_events.py          # Matches and loads verified flood disaster incidents
│   ├── compute_spatial_features.py   # Computes nearest_drain_m and depression_depth_m
│   ├── seed_subscribers.py           # Seeds demo subscribers across all 30 flood spots
│   └── main.py                       # Master data ingestion pipeline orchestrator
│
├── ml/
│   ├── dataset.py                    # Compiles training matrix of positive and negative monsoon hours
│   ├── label_matching.py             # Spatiotemporal matching between spots and flood incidents
│   ├── feature_engineering.py        # Feature builder for XGBoost (Gaussian storm curve, antecedent rain)
│   ├── confidence.py                 # Bayesian credible interval calculator (Beta posterior)
│   ├── shap_explainer.py             # TreeSHAP feature explainer extracting top 3 feature drivers
│   ├── learn_thresholds.py           # Computes Youden J cutoff, risk quartiles, and critical delta
│   ├── metrics.py                    # Evaluator computing ROC-AUC, Brier score, and PR curves
│   ├── train_model_a.py              # Trains Model A baseline (Rainfall + Terrain)
│   ├── train_model_b.py              # Trains Model B contextual (Model A + Drains + Crowd)
│   ├── predict.py                    # Unified runtime inference pipeline for single and batch predictions
│   └── models/
│       ├── model_a.joblib            # Serialized XGBoost Model A binary
│       ├── model_b.joblib            # Serialized XGBoost Model B binary
│       ├── feature_columns.json      # Exact feature column order for Model A and B
│       └── thresholds.json           # Learned operating thresholds and residual delta cutoffs
│
├── drain_health/
│   ├── compute_weekly_delta.py       # Aggregates model residual Δ into weekly time series
│   ├── fit_trend.py                  # Fits Ordinary Least Squares regression per drain
│   ├── predict_failure_date.py       # Extrapolates failure dates against critical thresholds
│   └── main.py                       # CLI runner to refresh drain health standings
│
├── backend/
│   ├── main.py                       # FastAPI application entrypoint with CORS and lifespan handler
│   ├── db.py                         # Async SQLAlchemy engine and session dependency
│   ├── deps.py                       # Dependency injection for process-wide singleton Predictor
│   ├── models/                       # SQLAlchemy declarative ORM models
│   │   ├── base.py                   # Base declarative class
│   │   ├── ward_boundary.py          # Ward boundary polygon ORM
│   │   ├── flood_spot.py             # Flood spots ORM
│   │   ├── drainage_segment.py       # Drainage lines ORM
│   │   ├── rainfall_daily.py         # Daily rainfall ORM
│   │   ├── flood_event.py            # Historical ground-truth flood event ORM
│   │   ├── feature_snapshot.py       # Training feature snapshot ORM
│   │   ├── prediction.py             # Dual-model prediction inference log ORM
│   │   ├── drain_health_weekly.py    # Weekly drain siltation series ORM
│   │   ├── crowd_report.py           # Citizen flood incident report ORM
│   │   ├── subscriber.py             # WhatsApp subscriber ORM (hashed phone)
│   │   └── alert_sent.py             # Outbound alert audit trail ORM
│   ├── schemas/                      # Pydantic v2 validation models
│   │   ├── health.py                 # System health and model status schemas
│   │   ├── spot.py                   # Spot risk, detail, and subscriber count schemas
│   │   ├── prediction.py             # Prediction request and decision response schemas
│   │   ├── drain_health.py           # Drain health leaderboard and trend detail schemas
│   │   ├── alert.py                  # Outbound dispatch, broadcast, and audit log schemas
│   │   └── crowd_report.py           # Citizen crowd report request/response schemas
│   ├── routers/                      # FastAPI REST API endpoints
│   │   ├── health.py                 # GET /api/health (Database & model readiness)
│   │   ├── spots.py                  # GET /api/spots, GET /api/spots/{id}
│   │   ├── predict.py                # POST /api/predict, POST /api/predict/all
│   │   ├── drain_health.py           # GET /api/drain-health, GET /api/drain-health/{id}
│   │   ├── alerts.py                 # POST /api/alert/send, POST /api/alert/broadcast/{id}, GET /api/alerts/log
│   │   ├── crowd_reports.py          # POST /api/crowd-report (Citizen inbound report)
│   │   └── whatsapp.py               # POST /api/whatsapp/webhook (Citizen WhatsApp bot webhook)
│   └── services/                     # Business logic and external service integrations
│       ├── prediction_service.py     # Inference execution and database persistence
│       ├── drain_health_service.py   # Degradation slope calculations and standing queries
│       ├── subscriber_service.py     # Citizen subscription management and spatial radius matching
│       ├── whatsapp_service.py       # Template composition, Twilio dispatch, and audit logging
│       └── crowd_match_service.py    # Spatial matching of crowd reports to nearest flood spot
│
├── frontend/                         # Next.js 14 Civic Operations Frontend
│   ├── package.json                  # Node.js dependencies (React 18, Leaflet, Recharts, SWR)
│   ├── tsconfig.json                 # TypeScript compiler configuration
│   ├── tailwind.config.ts            # TailwindCSS design system tokens and typography
│   ├── next.config.js                # Next.js configuration and environment variables
│   ├── public/
│   │   └── ward-g-south.geojson      # Static GeoJSON asset for client-side boundary overlay
│   └── src/
│       ├── styles/
│       │   └── globals.css           # Custom hairline scrollbars, Leaflet popup and GIS marker styling
│       ├── lib/
│       │   ├── api.ts                # Strongly-typed fetch client for all backend REST endpoints
│       │   ├── constants.ts          # Civic color palettes, risk tiers, and operational constants
│       │   ├── types.ts              # TypeScript interface definitions matching backend schemas
│       │   └── utils.ts              # Date, number, and percentage formatting utility functions
│       ├── hooks/                    # Reusable SWR data fetching hooks
│       │   ├── useSpots.ts           # Fetches and caches /api/spots
│       │   ├── useSpot.ts            # Fetches single spot detail with historical predictions
│       │   ├── usePredict.ts         # Dispatches live model inference requests
│       │   ├── useDrainHealth.ts     # Fetches drain health leaderboard and weekly trend details
│       │   ├── useAlertsLog.ts       # Queries alert audit trail and triggers broadcasts
│       │   └── useSubscriberCount.ts # Fetches subscriber count for a target spot
│       ├── components/
│       │   ├── Layout/
│       │   │   ├── Header.tsx        # Single-line 64px header with live IST clock and pulse dot
│       │   │   ├── Sidebar.tsx       # 4-item navigation rail (Live Map, Drain Health, Alerts, Arch)
│       │   │   └── StatusBar.tsx     # Telemetry connection status indicator
│       │   ├── Map/
│       │   │   ├── FloodMap.tsx      # Leaflet spatial map container with OpenStreetMap cartography
│       │   │   ├── SpotMarker.tsx    # L.circleMarker GIS circle markers with dark theme popups
│       │   │   └── WardBoundary.tsx  # PostGIS boundary outline rendering (solid charcoal)
│       │   ├── Dashboard/
│       │   │   ├── RiskPanel.tsx     # Slide-out inspection drawer with dual-model telemetry
│       │   │   ├── ShapChart.tsx     # TreeSHAP feature attribution horizontal bar chart
│       │   │   ├── DispatchCard.tsx  # Recommended municipal action protocol card
│       │   │   └── ConfidenceBadge.tsx # Bayesian 95% credible interval badge
│       │   ├── DrainHealth/
│       │   │   ├── Leaderboard.tsx   # Sortable and filterable drain siltation table
│       │   │   ├── TrendChart.tsx    # Weekly residual Δ time-series chart with linear trendline
│       │   │   └── FailureBadge.tsx  # Degradation status badge (Degrading, Overdue, Stable)
│       │   ├── Alerts/
│       │   │   └── AlertLog.tsx      # Immutable alert audit trail table with status filters
│       │   └── Icons/
│       │       └── index.tsx         # Handcrafted, lightweight SVG civic icon library
│       └── app/
│           ├── layout.tsx            # Root HTML layout and metadata configuration
│           ├── AppShell.tsx          # Responsive layout wrapper coordinating header and sidebar
│           ├── page.tsx              # Merged Live Operations Command Center (Map + KPIs + Risk Detail)
│           ├── drain-health/
│           │   └── page.tsx          # Drain Health & Siltation Index page
│           ├── alerts/
│           │   └── page.tsx          # Emergency Alert Broadcast & Audit Center page
│           ├── about/
│           │   └── page.tsx          # Municipal architecture and feature verification matrix
│           ├── privacy/
│           │   └── page.tsx          # Citizen privacy policy (SHA-256 phone anonymity)
│           └── terms/
│               └── page.tsx          # Civic terms of service and municipal data disclaimers
│
├── whatsapp_templates/               # Localized alert message templates
│   ├── alert_en.txt                  # English emergency advisory template
│   ├── alert_hi.txt                  # Hindi emergency advisory template
│   ├── alert_hinglish.txt            # Hinglish emergency advisory template
│   └── alert_mr.txt                  # Marathi emergency advisory template
│
├── scripts/
│   ├── capture_screenshots.py        # Automated headless browser screenshot capture script
│   └── verify_ui.py                  # Automated desktop and mobile layout validation test suite
│
├── tests/
│   └── test_subscribers.py           # Unit tests for subscriber hashing, expiration, and spatial radius
│
└── docs/
    ├── architecture.md               # Deep-dive system architecture documentation
    ├── api_reference.md              # OpenAPI and REST endpoint documentation
    ├── data_provenance.md            # Provenance records for CHIRPS, ERA5, NASA SRTM, and MCGM data
    ├── feature_status.md             # Real vs Simulated feature verification matrix
    ├── verification_run.md           # End-to-end model training, ingestion, and test run logs
    └── screenshots/                  # High-resolution UI captures of the civic dashboard
        ├── dashboard.png             # Live Map & Operational KPIs screenshot
        ├── drain_health.png          # Drain Health & Siltation Leaderboard screenshot
        ├── alerts.png                # Emergency Broadcast & Alert Audit screenshot
        └── about.png                 # Municipal Architecture & Feature Matrix screenshot
```
