# WardAlert — Final Round 2 Blueprint

**Team Byte Me | MUSA CodeX 2026 | PS CX0404 — Hyperlocal Flood-Risk Alert System**
**Deadline: 22 September 2026 | Deliverables: YouTube Demo (≤3 min) + GitHub Repo + Updated PPT (≤10 slides)**
**Judging: 100 marks — Problem 15 · Innovation 20 · Technical 25 · Feasibility 15 · Impact 15 · Presentation 10**

---

## 0. Current Status Snapshot (Sept 19)

| Component | Status | Owner |
|-----------|--------|-------|
| Real public dataset ingestion | ✅ COMPLETE | Aarana + Vidit |
| PostgreSQL + PostGIS schema | 🟡 Ready to build | Vidit |
| ML pipeline (dual-model + SHAP) | 🟡 Ready to build | Dhruv |
| FastAPI backend | 🟡 Ready to build | Vidit |
| Next.js dashboard | 🟡 Ready to build | Vedant |
| WhatsApp bot | 🟡 Ready to build | Vidit |
| Drain Health Index | 🟡 Ready to build | Dhruv |
| Demo video + PPT | 🔲 Day 3 | Aarana |

**Data confirmed loaded (real, from public sources):**
- 30 chronic flood spots — real coordinates in Ward G-South
- 1096 daily rainfall records (Jan 2023 – Dec 2025) — CHIRPS/ERA5 via Open-Meteo Archive API
- 54 drainage segments — real OSM waterway data (OSM IDs preserved)
- 32 historical flood events — real dates from BMC + news archives
- Ward G-South boundary — real BMC polygon
- SRTM 30m elevation tile (N19E072.hgt) — real USGS data

---

## 1. Full Project Structure

```
wardalert/
├── README.md                             # Setup instructions (rubric requires this)
├── .env.example                          # Config template
├── .gitignore
├── docker-compose.yml                    # PostGIS + FastAPI + Next.js
├── requirements.txt
│
├── data/                                 # ✅ DONE — real public data (from prev pipeline)
│   ├── raw/
│   │   ├── N19E072.hgt                   # SRTM elevation
│   │   └── BMC_Wards.geojson             # BMC ward polygons
│   └── processed/
│       ├── flood_spots_gsouth.csv        # 30 spots
│       ├── rainfall_daily_gsouth.csv     # 1096 rows
│       ├── flood_events_gsouth.csv       # 32 events
│       ├── drainage_gsouth.geojson       # 54 OSM segments
│       └── ward_gsouth_boundary.geojson  # G-South polygon
│
├── config.py                             # Central config — every value from env
│
├── database/
│   ├── init.sql                          # 9 tables + 1 view — DDL only
│   └── migrations/                       # (empty for MVP)
│
├── data_loader/                          # Bulk load data/ into Postgres
│   ├── __init__.py
│   ├── load_ward_boundary.py
│   ├── load_drainage.py
│   ├── load_flood_spots.py
│   ├── load_rainfall.py
│   ├── load_flood_events.py
│   ├── compute_spatial_features.py       # nearest_drain_m via ST_Distance
│   └── main.py                           # Runs all in dependency order
│
├── ml/
│   ├── __init__.py
│   ├── feature_engineering.py            # Build feature_snapshots from raw tables
│   ├── label_matching.py                 # Fuzzy match events → spots
│   ├── train_model_a.py                  # XGBoost rain-only → P_rain
│   ├── train_model_b.py                  # XGBoost full context → P_actual
│   ├── learn_thresholds.py               # ROC/Youden's J — no hand-picked cutoffs
│   ├── shap_explainer.py                 # SHAP TreeExplainer wrapper
│   ├── confidence.py                     # Bayesian CI (Beta posterior)
│   ├── predict.py                        # End-to-end inference used by API
│   ├── models/                           # Saved artifacts (gitignored)
│   │   ├── model_a.joblib
│   │   ├── model_b.joblib
│   │   ├── thresholds.json               # Learned δ_dispatch, risk quantiles
│   │   └── feature_columns.json          # Locked feature order
│   └── notebooks/
│       └── training_walkthrough.ipynb    # For judges reviewing repo
│
├── drain_health/                         # NOVEL — our key differentiator
│   ├── __init__.py
│   ├── compute_weekly_delta.py           # GROUP BY spot × week
│   ├── fit_trend.py                      # Linear regression per spot
│   ├── predict_failure_date.py           # Extrapolate to critical_delta
│   └── main.py                           # Orchestrator
│
├── backend/
│   ├── __init__.py
│   ├── main.py                           # FastAPI app + lifespan (loads models)
│   ├── db.py                             # Async SQLAlchemy engine
│   ├── deps.py                           # get_db, get_models dependencies
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py                     # GET /api/health
│   │   ├── spots.py                      # GET /api/spots, /api/spots/{id}
│   │   ├── predict.py                    # POST /api/predict, /api/predict/all
│   │   ├── drain_health.py               # GET /api/drain-health, /api/drain-health/{id}
│   │   ├── crowd_reports.py              # POST /api/crowd-report, GET /api/crowd-reports
│   │   └── alerts.py                     # POST /api/alert/send, GET /api/alerts/log
│   ├── services/
│   │   ├── __init__.py
│   │   ├── prediction_service.py         # Load features → dual model → Δ → SHAP → CI
│   │   ├── drain_health_service.py       # Weekly Δ aggregation & trend
│   │   ├── crowd_match_service.py        # PostGIS ST_DWithin nearest-spot match
│   │   └── whatsapp_service.py           # Twilio sandbox (falls back to simulated)
│   ├── models/                           # SQLAlchemy ORM (one file per table)
│   │   ├── __init__.py
│   │   ├── flood_spot.py
│   │   ├── drainage_segment.py
│   │   ├── rainfall_daily.py
│   │   ├── feature_snapshot.py
│   │   ├── prediction.py
│   │   ├── crowd_report.py
│   │   ├── drain_health_weekly.py
│   │   ├── alert_sent.py
│   │   └── ward_boundary.py
│   └── schemas/                          # Pydantic request/response
│       ├── __init__.py
│       ├── spot.py
│       ├── predict.py
│       ├── drain_health.py
│       ├── crowd_report.py
│       └── alert.py
│
├── whatsapp_templates/                   # Not hardcoded — files per language
│   ├── alert_en.txt
│   ├── alert_hi.txt
│   ├── alert_hinglish.txt
│   └── alert_mr.txt
│
├── frontend/                             # Vedant's Next.js dashboard
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── public/
│   │   └── ward-g-south.geojson
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                  # Dashboard home — map view
│       │   ├── drain-health/page.tsx     # Drain Health leaderboard
│       │   ├── alerts/page.tsx           # Alerts log
│       │   └── about/page.tsx            # Architecture + feature status
│       ├── components/
│       │   ├── Map/{FloodMap,SpotMarker,WardBoundary}.tsx
│       │   ├── Dashboard/{RiskPanel,ShapChart,ConfidenceBadge,DispatchCard}.tsx
│       │   ├── DrainHealth/{Leaderboard,TrendChart,FailureAlert}.tsx
│       │   ├── Alerts/AlertLog.tsx
│       │   └── Layout/{Sidebar,Header,StatusBar}.tsx
│       ├── hooks/
│       │   ├── useSpots.ts
│       │   ├── useSpotDetail.ts
│       │   └── useDrainHealth.ts
│       ├── lib/{api,constants}.ts
│       └── styles/globals.css
│
├── tests/
│   ├── test_data_loader.py
│   ├── test_ml_pipeline.py
│   └── test_api.py
│
└── docs/
    ├── architecture.md                   # 5-layer pipeline diagram + text
    ├── api_reference.md                  # Endpoint docs + sample req/res
    ├── data_provenance.md                # What's real vs simulated (rubric)
    └── feature_status.md                 # Working / simulation / planned matrix
```

---

## 2. Database Schema (PostgreSQL 16 + PostGIS 3.4)

`database/init.sql` — 9 tables, 1 view.

**Tables:**

1. **ward_boundary** — G-South polygon
2. **flood_spots** — 30 chronic flood locations (POINT geometry)
3. **drainage_segments** — 54 OSM waterway LineStrings
4. **rainfall_daily** — 1096 rows of real daily rainfall
5. **flood_events** — 32 real historical flood dates matched to spots
6. **feature_snapshots** — computed feature vectors (spot × timestamp) for training + inference
7. **predictions** — every prediction served (spot × timestamp → p_rain, p_actual, Δ, SHAP)
8. **crowd_reports** — citizen flood reports with PostGIS location + language + severity
9. **drain_health_weekly** — weekly Δ aggregation per spot with trend + failure date
10. **alerts_sent** — log of WhatsApp alerts dispatched

**View:**

- **v_latest_risk** — DISTINCT ON (spot_id) latest prediction per spot, joined to flood_spots. Powers the dashboard map.

Key indexes: `GIST` on all geometry columns; `BTREE` on `(spot_id, timestamp DESC)` for predictions/features.

---

## 3. Config Management — Nothing Hardcoded

`config.py` reads every value from environment variables, with sensible defaults for local dev:

- **Paths:** `DATA_DIR`, `MODEL_DIR`, `TEMPLATE_DIR`
- **Database:** `DATABASE_URL` (async), `SYNC_DATABASE_URL`
- **Feature engineering:** `ROLLING_WINDOWS_HOURS`, `ANTECEDENT_DAYS`, `CROWD_RADIUS_M`, `CROWD_WINDOW_MIN`, `MONSOON_START_MONTH`, `MONSOON_END_MONTH`
- **ML:** `XGB_N_ESTIMATORS`, `XGB_MAX_DEPTH`, `XGB_LEARNING_RATE`, `TRAIN_TEST_SPLIT`, `RANDOM_SEED`, `NEG_POS_RATIO`, `FUZZY_MATCH_THRESHOLD`
- **Twilio (optional):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` — if unset, WhatsApp falls back to logged-simulated mode
- **API:** `API_HOST`, `API_PORT`, `CORS_ORIGINS`

Every threshold that could be arbitrary is either:
- Set by config (with clear documentation of default), OR
- Learned from data (see §5)

---

## 4. Feature Engineering

**`ml/feature_engineering.py` produces `feature_snapshots` table.**

For each (spot × timestamp) pair:

| Feature | Formula |
|---------|---------|
| `rain_1h` | Rolling 1h rainfall (interpolated from daily using temporal-decay curve) |
| `rain_3h` | Rolling 3h rainfall |
| `rain_24h` | Rolling 24h rainfall |
| `antecedent_moisture` | Exponentially-decayed sum over ANTECEDENT_DAYS (default 3) |
| `elevation_m` | From `flood_spots.elevation_m` (SRTM) |
| `depression_depth_m` | From `flood_spots.depression_depth_m` |
| `drain_distance_m` | From `flood_spots.nearest_drain_m` (PostGIS pre-computed) |
| `monsoon_week` | 1-indexed week within monsoon season |
| `hour_of_day` | timestamp.hour |
| `crowd_reports_500m_2h` | COUNT via `ST_DWithin` with config values |
| `crowd_weighted_score` | Recency-weighted crowd signal |

**Training set construction:**
- 32 positive samples: one snapshot per real flood event (spot × event_timestamp)
- ~160 negative samples: random monsoon-season timestamps with no nearby flood event (NEG_POS_RATIO = 5)
- If dataset < 100 rows, warn and increase NEG_POS_RATIO — never fabricate positive labels

**Label matching (`ml/label_matching.py`):**
- Fuzzy-match flood event spot names to `flood_spots.name` using `difflib.SequenceMatcher`
- Threshold from config (default 0.7)
- Log unmatched events for manual review — never silently drop

---

## 5. ML Pipeline — Learned Thresholds

**Model A (`ml/train_model_a.py`) — rain-only baseline:**
- Features: `rain_1h, rain_3h, rain_24h, antecedent_moisture, elevation_m, depression_depth_m`
- XGBoost with hyperparameters from config
- Stratified train/test split
- Output: `P_rain` = probability of flooding from rainfall alone

**Model B (`ml/train_model_b.py`) — full context:**
- Model A features PLUS `drain_distance_m, monsoon_week, hour_of_day, crowd_reports_500m_2h`
- Output: `P_actual` = probability of flooding given all factors

**The dual-model residual (core innovation):**

```
Δ = P_actual − P_rain
```

**Learned thresholds (`ml/learn_thresholds.py`) — no hand-picked values:**

- **Dispatch threshold (rain-driven vs drain-driven):** Youden's J on Δ vs a "drain-related" label derived from event proximity to a drain segment. Result: `δ_dispatch`.
- **Risk levels:** Quartiles of `P_actual` on the test set — low/moderate/high/critical.
- **Critical Δ for drain failure:** 90th percentile of observed Δ across the test set.

All learned thresholds saved to `ml/models/thresholds.json` — the API reads from this file, never from constants.

**SHAP (`ml/shap_explainer.py`):**
- SHAP TreeExplainer on Model B
- Returns top 3 contributing features per prediction with direction (increases_risk / decreases_risk)

**Bayesian confidence (`ml/confidence.py`):**
- Beta posterior on the prediction — CI from 5th–95th percentile

---

## 6. Drain Health Index — Novel Contribution

`drain_health/` module. Runs after models are trained on the full monsoon 2023–2025 predictions.

**Weekly aggregation:**
```
GROUP BY (spot_id, year, week_number)
→ avg_delta, max_delta, prediction_count
UPSERT into drain_health_weekly
```

**Trend fit:**
- For each spot with ≥ 4 weeks of data: `np.polyfit(weeks, avg_delta, deg=1)` → `trend_slope`

**Failure date prediction:**
- Solve for week when `trend_slope × week + intercept = critical_delta`
- Convert back to date → `predicted_failure_date`
- `health_score = 100 × (1 − avg_delta / critical_delta)`, clipped [0, 100]

---

## 7. FastAPI Backend — 11 Endpoints

Every endpoint uses async SQLAlchemy, Pydantic response models, and reads config from env.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | `{status, db, models_loaded}` |
| GET | `/api/spots` | All 30 spots with latest risk (from `v_latest_risk`) |
| GET | `/api/spots/{id}` | Spot detail + latest prediction + 24h history |
| POST | `/api/predict` | Run prediction for `{spot_id, timestamp?}` |
| POST | `/api/predict/all` | Batch predict all spots at current timestamp |
| GET | `/api/drain-health` | Leaderboard sorted by health_score ASC |
| GET | `/api/drain-health/{id}` | Weekly Δ series + trend + failure date |
| POST | `/api/crowd-report` | Submit citizen flood report |
| GET | `/api/crowd-reports` | Recent reports with matched spot names |
| POST | `/api/alert/send` | Trigger WhatsApp alert for a spot |
| GET | `/api/alerts/log` | Recent alerts sent |

Auto-generated Swagger UI at `/docs`. CORS enabled from config.

**Startup lifespan:** loads `model_a.joblib`, `model_b.joblib`, `thresholds.json`, `feature_columns.json` once. Models are shared across requests.

---

## 8. Frontend — Next.js Dashboard

**Page 1: Map Dashboard (`/`)**
- Full-screen Leaflet map centered on Ward G-South (19.015°N, 72.825°E)
- Ward boundary GeoJSON overlay
- 30 circle markers color-coded by risk (green → yellow → orange → red)
- Click marker → right panel slides in with: spot name, P_rain, P_actual, Δ, cause label, SHAP bar chart (Recharts), dispatch recommendation, confidence interval

**Page 2: Drain Health (`/drain-health`)**
- Leaderboard: spot name, health score, trend direction, predicted failure date
- Red rows for spots predicted to fail within 2 weeks
- Click row → line chart of weekly Δ with trend line + failure projection

**Page 3: Alerts (`/alerts`)**
- Log table: timestamp, spot, language, template, status
- "Send Test Alert" button (Twilio sandbox)
- Template preview panel (all 4 languages)

**Page 4: About (`/about`)**
- Architecture diagram (5-layer pipeline)
- Feature Status matrix (working / simulated / planned)
- Team info

---

## 9. WhatsApp Templates (NOT hardcoded strings)

`whatsapp_templates/alert_{lang}.txt` — Python format-string templates with placeholders `{spot_name}, {risk_level}, {cause_label}, {p_actual_pct}, {rain_3h}, {updated_ago}`.

**English (alert_en.txt):**
```
⚠️ FLOOD ALERT — {spot_name}
Risk: {risk_level} ({p_actual_pct}%)
Cause: {cause_label}
Action: {dispatch_action}

Rain (3h): {rain_3h}mm | Updated: {updated_ago}
Reply HINDI, HINGLISH, or MARATHI for other languages.
```

**Twilio integration:** if `TWILIO_*` env vars are set, sends via Twilio SDK. If not set, logs the rendered message to stdout and marks `status='simulated'` in `alerts_sent`. Demo works without Twilio credentials.

---

## 10. Run Order

```bash
# 1. Setup
cp .env.example .env
docker-compose up -d db     # Starts PostGIS

# 2. Load real data (already prepared)
python -m data_loader.main

# 3. Build features + train models
python -m ml.feature_engineering
python -m ml.label_matching
python -m ml.train_model_a
python -m ml.train_model_b
python -m ml.learn_thresholds

# 4. Bootstrap drain health (predictions across historical monsoon weeks)
python -m drain_health.main

# 5. Start API
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# 6. Start frontend (new terminal)
cd frontend && npm install && npm run dev

# Open http://localhost:3000
```

Total build time on Claude Code: ~30–45 min.

---

## 11. Verification Checks (rubric-relevant)

After running everything:

```bash
curl http://localhost:8000/api/health
# → {"status":"ok","db":"connected","models_loaded":true}

curl http://localhost:8000/api/spots | jq 'length'
# → 30

curl -X POST http://localhost:8000/api/predict \
     -H "Content-Type: application/json" -d '{"spot_id": 1}' | jq
# → full prediction JSON with p_rain, p_actual, delta, risk_level, cause_label, shap_top3, confidence

curl http://localhost:8000/api/drain-health | jq '.[:5]'
# → 5 spots ranked by health_score
```

Database sanity:
```sql
SELECT 'flood_spots' AS t, COUNT(*) FROM flood_spots
UNION ALL SELECT 'rainfall_daily', COUNT(*) FROM rainfall_daily
UNION ALL SELECT 'drainage_segments', COUNT(*) FROM drainage_segments
UNION ALL SELECT 'flood_events', COUNT(*) FROM flood_events
UNION ALL SELECT 'feature_snapshots', COUNT(*) FROM feature_snapshots
UNION ALL SELECT 'predictions', COUNT(*) FROM predictions
UNION ALL SELECT 'drain_health_weekly', COUNT(*) FROM drain_health_weekly;
```
Expected: `30 / 1096 / 54 / 32 / ~190 / ~190 / ~120`

Model performance minima:
- Model A test AUC ≥ 0.65
- Model B test AUC ≥ 0.72
- Model B AUC > Model A AUC (dual-model architecture makes sense)

---

## 12. Team Task Split — Final 3 Days

### Day 1 (Sept 20)

| Person | Tasks | Deliverable |
|--------|-------|-------------|
| **Aarana** | Compile flood_events extension (add 10 more real events from Twitter/news). Write `docs/data_provenance.md` and `docs/feature_status.md`. | Extended events CSV + docs |
| **Dhruv** | Build `ml/feature_engineering.py` + `label_matching.py`. Train Model A + B. Run `learn_thresholds.py`. Verify AUC ≥ 0.65/0.72. | Trained .joblib files + thresholds.json |
| **Vidit** | Docker Compose up. Build `database/init.sql` schema. Run `data_loader/main.py`. Verify counts. Build FastAPI skeleton + `/api/health`, `/api/spots`. | Running API on :8000 |
| **Vedant** | Scaffold Next.js + Tailwind. Build FloodMap.tsx with Leaflet + Ward boundary GeoJSON. Fetch `/api/spots` and render 30 markers. | Map showing 30 spots |

### Day 2 (Sept 21)

| Person | Tasks | Deliverable |
|--------|-------|-------------|
| **Aarana** | Build drain_health module (weekly Δ, trend, failure date). Update PPT to 10 slides. Merge Slides 4+5 to cut one. Add "Feature Status" slide. | Populated `drain_health_weekly` + updated PPT |
| **Dhruv** | Build `shap_explainer.py` + `confidence.py`. Build `prediction_service.py`. Test end-to-end predict returns SHAP + CI. Write `training_walkthrough.ipynb`. | Working /api/predict with SHAP |
| **Vidit** | Complete remaining routers: `/api/predict`, `/api/spots/{id}`, `/api/drain-health`, `/api/crowd-report`, `/api/alert/send`. Configure Twilio sandbox. | All 11 endpoints working |
| **Vedant** | Build RiskPanel + ShapChart (Recharts). Build Drain Health page + TrendChart. Build Alerts page. Wire to all endpoints. | Full dashboard clickable |

### Day 3 (Sept 22)

| Person | Tasks | Deliverable |
|--------|-------|-------------|
| **Aarana** | Write final README with setup instructions. Record demo video narration (3 min script). Final PPT review. Prepare Q&A responses. | Video + PPT + README |
| **Dhruv** | End-to-end testing. Fix any ML/data issues. Assist video with terminal /api/predict demo. | Bug fixes |
| **Vidit** | Push to GitHub. Deploy to Railway/Render (optional). Verify all setup instructions work from scratch. | Public repo URL |
| **Vedant** | UI polish — loading states, dark theme, responsive. Record screen for dashboard portions of video. | Screen recording |

---

## 13. Demo Video Script (3 min)

| Time | Screen | Voiceover |
|------|--------|-----------|
| 0:00–0:15 | Mumbai flooding photo + WardAlert logo | "Mumbai floods kill people every monsoon. Existing alerts are city-wide — nobody knows which street will flood or why." |
| 0:15–0:45 | Dashboard map, 30 colored spots on Ward G-South | "WardAlert predicts flooding at 30 real flood-prone spots in Ward G-South. Trained on real rainfall from 2023–2025 and real historical flood events." |
| 0:45–1:15 | Click red spot → RiskPanel with SHAP chart | "This is Hindmata Junction. Two ML models run in parallel — the gap between them shows this flood is drain-driven, not rain-driven. SHAP tells us why: drain distance, monsoon week, antecedent moisture." |
| 1:15–1:40 | Dispatch card: "Send desilting crew" | "BMC sees exactly which crew to send. Pump truck for rain flooding. Desilting for drain-driven. No more guessing." |
| 1:40–2:10 | Drain Health page — leaderboard + trend chart | "Novel contribution: Drain Health Index. Weekly Δ trending upward means the drain is silting up. We predict failure by October 4th. Fix it now, not after the flood." |
| 2:10–2:30 | Phone screen: WhatsApp bot conversation in Marathi | "Citizens get alerts on WhatsApp in 4 languages. No app download. Reaches non-smartphone users." |
| 2:30–2:45 | Terminal: `curl /api/predict` → JSON response | "Full REST API on PostgreSQL + PostGIS. Real database, not hardcoded." |
| 2:45–3:00 | Feature Status slide: working / simulation / planned | "Rainfall, elevation, drainage, flood labels — all real public data. Crowd reports simulated because WardAlert creates that channel. Everything else works end-to-end." |

---

## 14. Feature Status Matrix (rubric explicitly requires this)

| Feature | Status | Notes |
|---------|--------|-------|
| 30 real geocoded flood spots | ✅ Working | Real BMC-identified chronic spots |
| Real CHIRPS/ERA5 rainfall 2023–2025 | ✅ Working | 1096 daily records from Open-Meteo Archive API |
| Real SRTM 30m elevation per spot | ✅ Working | USGS N19E072 tile |
| Real OSM drainage network | ✅ Working | 54 waterway segments with OSM IDs |
| Real historical flood event labels | ✅ Working | 32 events from BMC + news |
| PostgreSQL + PostGIS spatial DB | ✅ Working | 9 tables, spatial indexes, view |
| Dual-model XGBoost (A + B) | ✅ Working | Trained on real data, learned thresholds |
| SHAP TreeExplainer — top 3 features | ✅ Working | Real SHAP library integration |
| Cause attribution (rain vs drain) | ✅ Working | Δ = P_actual − P_rain with learned threshold |
| BMC Dashboard — Leaflet + panels | ✅ Working | Next.js + Recharts |
| Drain Health Index (weekly Δ + trend) | ✅ Working | Linear regression per spot |
| Predicted drain failure dates | ✅ Working | Extrapolation to learned critical Δ |
| Dispatch recommendation | ✅ Working | Rule uses learned δ_dispatch |
| Bayesian confidence intervals | ✅ Working | Beta posterior per prediction |
| FastAPI REST — 11 endpoints | ✅ Working | Async SQLAlchemy + Pydantic |
| WhatsApp templates (4 languages) | ✅ Working | English, Hindi, Hinglish, Marathi |
| Twilio WhatsApp delivery | 🔶 Simulation | Sandbox only for MVP; templates render either way |
| Crowd reports intake | ✅ Working | POST endpoint + PostGIS matching |
| Crowd reports historical data | 🔶 Simulation | WardAlert creates this channel — no history exists |
| Crowd → spot match (500m/2h) | ✅ Working | Real PostGIS ST_DWithin |
| Live rainfall push | 🔶 Simulation | Historical replay; IITM API planned |
| Socket.io live updates | 🔲 Planned | Polling in MVP |
| Multi-ward scaling | 🔲 Planned | Architecture supports GeoJSON swap |
| Auth (role-based) | 🔲 Planned | No auth in MVP |
| Weekly model retraining automation | 🔲 Planned | Scripts exist, cron planned |

---

## 15. PPT Update (cut from 11 to 10 slides)

Merge current Slide 4 (Problem Statement) + Slide 5 (Existing Solutions) into one slide:
- Left half: Problem statement + Mumbai flooding photo (compressed)
- Right half: 3 existing solutions with 1-line gaps each

Add new Slide 10 (replacing the Solution Summary): "Feature Status — Working / Simulated / Planned" — the matrix from §14 above. This directly answers rubric requirement.

Keep Slides 1 (Title), 2 (Domain/PS/Team), 3 (Team), 6 (Proposed Solution), 7 (Technical Approach), 8 (Feasibility/Impact), 9 (Dev Plan), 11 (References).

---

## 16. Judging Criteria Mapping (100 marks)

| Criterion | Marks | How WardAlert Scores |
|-----------|-------|---------------------|
| Problem understanding | 15 | Slide 4 + real BMC flood spot references + real flood events cited |
| Innovation | 20 | Dual-model residual + Drain Health Index (novel) + cause attribution mechanically separates rain vs drain |
| Technical implementation | 25 | Real DB, real ML, real data, 11 working endpoints, SHAP, learned thresholds — video shows it running |
| Feasibility | 15 | All open-source, all public data, no hardware, 30 spots manageable, scales to 24 wards |
| Impact | 15 | 15–20min lead time vs 0 today; correct crew dispatch; multilingual reach |
| Presentation | 10 | Clean deck + 3-min video + live demo |

---

## 17. Setup Instructions (README.md content)

```bash
# Prerequisites
# - Docker + Docker Compose
# - Python 3.11+
# - Node.js 18+

# Clone
git clone https://github.com/byte-me-codex/wardalert.git
cd wardalert

# Environment
cp .env.example .env
# Optionally edit .env for Twilio credentials

# Bring up PostGIS
docker-compose up -d db

# Install Python deps
pip install -r requirements.txt

# Load real data + train models + bootstrap drain health
python -m data_loader.main
python -m ml.feature_engineering
python -m ml.label_matching
python -m ml.train_model_a
python -m ml.train_model_b
python -m ml.learn_thresholds
python -m drain_health.main

# Start API
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Start frontend (new terminal)
cd frontend
npm install
npm run dev

# Open dashboard
open http://localhost:3000

# Swagger API docs
open http://localhost:8000/docs
```

---

## 18. Deliverables Checklist (Sept 22, 11:59 PM)

- [ ] YouTube demo video (≤ 3 min) — public link
- [ ] GitHub repository — public, with README + setup instructions + sample .env
- [ ] Updated PPT (≤ 10 slides) — includes Feature Status matrix
- [ ] Round 2 registration fee ₹400 paid
- [ ] Submission form filled on MUSA CodeX portal

---

## 19. Post-Submission Hardening (if judges request live demo)

- Deploy backend to Railway or Render (free tier)
- Deploy frontend to Vercel (free tier)
- Whitelist judge phone numbers in Twilio sandbox for live WhatsApp demo
- Prep 2 backup scenarios for the live Q&A: "what if OSM drain data is wrong?", "what if a real emergency happened?"

---

## Sources & Data Provenance

- CHIRPS/ERA5 rainfall via Open-Meteo Archive API — https://open-meteo.com/en/docs/historical-weather-api
- USGS SRTM 30m elevation — https://opentopography.org
- OpenStreetMap waterway data — via OSMnx / Overpass API
- DataMeet BMC Ward Boundaries — https://github.com/datameet/Municipal_Spatial_Data
- Historical flood events — compiled from BMC monsoon reports, Free Press Journal, Hindustan Times, Mid-Day archives 2023–2025
- SHAP: Lundberg & Lee (2017) — Unified Approach to Interpreting Model Predictions
- XGBoost: Chen & Guestrin (2016)
