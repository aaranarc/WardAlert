# WardAlert

Hyperlocal flood prediction for **Mumbai Ward G/South**, built on real public
data: 30 BMC-identified chronic flooding spots, 54 OSM drainage segments, 1096
days of CHIRPS/ERA5 rainfall, and 32 documented flood events.

Built for MUSA CodeX 2026.

---

## The idea

Rainfall alone does not explain where Mumbai floods. Two spots a kilometre
apart, under the same cloudburst, behave completely differently — because one
of them has a drain that is silting up.

WardAlert trains **two** models on the same data:

| | Sees | Predicts |
|---|---|---|
| **Model A** | rainfall + terrain only | `P_rain` |
| **Model B** | everything, incl. drainage distance + crowd reports | `P_actual` |

The gap between them is the whole product:

```
Δ = P_actual − P_rain
```

Δ is flood risk that rainfall **does not** explain — the signature of a drain
not carrying what it should. That single number does three jobs:

1. **Dispatch.** High Δ means send a desilting crew, not a pump.
2. **Explanation.** SHAP names the three features that drove each score.
3. **Prediction of the failure itself.** Δ tracked weekly per spot, fitted and
   extrapolated to a learned critical level, gives a *maintenance date* —
   turning reactive desilting into scheduled work.

Every operating threshold is **learned, never chosen**: the dispatch cut comes
from Youden's J, risk bands from quartiles, the critical Δ from a percentile.
They live in `ml/models/thresholds.json`, which the API reads at startup.

---

## Setup

Requires Docker and Python 3.11+.

```bash
git clone https://github.com/aaranarc/WardAlert.git
cd WardAlert

python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # every tunable is documented in there
```

If port 5432 is already in use on your machine, set `POSTGRES_PORT` in `.env`
to a free port before continuing — everything reads that value.

```bash
docker compose up -d db
docker logs wardalert-db-1 | tail -5     # "ready to accept connections"
```

## Run order

Each step is idempotent and can be re-run safely.

```bash
python -m data_loader.main       # load all 5 datasets + derive spatial features
python -m ml.label_matching      # confirm all 32 events matched to a spot
python -m ml.feature_engineering # build 192 training snapshots
python -m ml.train_model_a       # rain-only baseline
python -m ml.train_model_b       # full context; must beat Model A
python -m ml.learn_thresholds    # Youden's J, quartiles, critical Δ
python -m drain_health.main      # bootstrap history, then build the index

uvicorn backend.main:app --reload --port 8000
```

- API: <http://localhost:8000>
- Swagger UI: <http://localhost:8000/docs>

`ml/models/*.joblib` are gitignored — regenerate them with the training steps
above. `feature_columns.json` and `thresholds.json` **are** committed, since
they are configuration rather than binaries.

---

## Sample requests

```bash
curl http://localhost:8000/api/health
# {"status":"ok","db":true,"models_loaded":true,"version":"0.1.0"}

curl http://localhost:8000/api/spots | jq 'length'    # 30

# predict at a real flood moment — Hindmata, 15 Jul 2025
curl -X POST http://localhost:8000/api/predict \
     -H "Content-Type: application/json" \
     -d '{"spot_id": 1, "timestamp": "2025-07-15T10:30:00Z"}' | jq

# the maintenance leaderboard, worst drain first
curl http://localhost:8000/api/drain-health | jq '.[:5]'

# a citizen report, snapped to the nearest spot by PostGIS
curl -X POST http://localhost:8000/api/crowd-report \
     -H "Content-Type: application/json" \
     -d '{"lat": 19.010, "lng": 72.842, "severity": "knee-deep", "language": "en"}'

# an alert (simulated unless TWILIO_ACCOUNT_SID is set)
curl -X POST http://localhost:8000/api/alert/send \
     -H "Content-Type: application/json" \
     -d '{"spot_id": 1, "language": "mr"}' | jq -r .body
```

---

## Layout

```
config.py              every tunable, read from the environment
database/init.sql      10 tables + v_latest_risk, PostGIS, TIMESTAMPTZ
data_loader/           idempotent loaders + derived spatial features
ml/                    features, dual models, learned thresholds, SHAP, inference
drain_health/          weekly Δ, trend fit, failure date
backend/               FastAPI: 11 endpoints, async SQLAlchemy
whatsapp_templates/    alert text, one file per language
docs/                  architecture, API reference, provenance, feature status
```

---

## Frontend (Next.js Dashboard)

The frontend is a dark-mode Next.js 14 dashboard consuming the FastAPI backend.

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# Dashboard opens at http://localhost:3000
```

### Dashboard Pages

- **`/` (Live Flood Map)**: Leaflet map of Ward G-South with 30 chronic spots, color-coded by learned risk quartile, CARTO dark tiles, GeoJSON ward boundary, slide-in RiskPanel with SHAP attribution bars, Bayesian credible interval bar, and dispatch recommendation cards.
- **`/drain-health` (Drain Health Index)**: Prioritisation leaderboard sorted by health score (worst first), with longitudinal weekly Δ residual trend charts and extrapolated failure horizons.
- **`/alerts` (Alert Broadcast & Log)**: Live multilingual test-send form (English, Hindi, Hinglish, Marathi) and real-time dispatched audit log with modal message preview.
- **`/about` (Feature Status & Architecture)**: Interactive mirror of `docs/feature_status.md` disclosing what runs on real data vs simulation.

---

## Documentation

| Document | What it covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | the 5-layer pipeline |
| [docs/api_reference.md](docs/api_reference.md) | all 11 endpoints with samples |
| [docs/data_provenance.md](docs/data_provenance.md) | what is real vs. derived vs. simulated |
| [docs/feature_status.md](docs/feature_status.md) | working / simulation / planned |
| [docs/verification_run.md](docs/verification_run.md) | recorded end-to-end run |

**Read `docs/feature_status.md` before demoing.** It states plainly which parts
run on real data, which are simulated, and which are not built yet.

