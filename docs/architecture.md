# Architecture — the 5-layer pipeline

```
   data/  (real public data, committed)
     │
 ┌───▼──────────────────────────────────────────────────────────┐
 │ 1. INGEST      data_loader/                                  │
 │    GeoJSON + CSV ──► PostGIS. Idempotent upserts.            │
 │    Derives nearest_drain_m (PostGIS) and                     │
 │    depression_depth_m (SRTM) — neither is in the source.     │
 └───┬──────────────────────────────────────────────────────────┘
     │  flood_spots · drainage_segments · rainfall_daily · flood_events
 ┌───▼──────────────────────────────────────────────────────────┐
 │ 2. FEATURES    ml/feature_engineering.py                     │
 │    32 positives (real events) + 160 sampled negatives.       │
 │    Daily rain ──► hourly via a documented diurnal curve.     │
 └───┬──────────────────────────────────────────────────────────┘
     │  feature_snapshots (192 rows)
 ┌───▼──────────────────────────────────────────────────────────┐
 │ 3. DUAL MODEL  ml/train_model_a.py · train_model_b.py        │
 │    A: rain + terrain        ──► P_rain     AUC 0.819         │
 │    B: A + drainage/time/crowd ──► P_actual AUC 0.850         │
 │    Δ = P_actual − P_rain                                     │
 └───┬──────────────────────────────────────────────────────────┘
     │
 ┌───▼──────────────────────────────────────────────────────────┐
 │ 4. LEARNED THRESHOLDS   ml/learn_thresholds.py               │
 │    δ_dispatch   Youden's J on Δ vs drain-related             │
 │    risk bands   quartiles of P_actual                        │
 │    critical_Δ   p90 of Δ                                     │
 │    ──► ml/models/thresholds.json                             │
 └───┬──────────────────────────────────────────────────────────┘
     │
 ┌───▼───────────────────────────┬──────────────────────────────┐
 │ 5a. SERVE   backend/          │ 5b. DRAIN HEALTH             │
 │     11 FastAPI endpoints      │     drain_health/            │
 │     SHAP + Bayesian CI        │     weekly Δ ──► trend ──►   │
 │     WhatsApp alerts           │     failure date             │
 └───────────────────────────────┴──────────────────────────────┘
```

---

## Layer 1 — Ingest (`data_loader/`)

Loads five committed datasets into PostGIS. Every loader upserts on the natural
key of its source file, so `python -m data_loader.main` can run any number of
times without duplicating or losing rows.

Two columns are **derived here**, because they do not exist in the source data
but the models need them:

- **`nearest_drain_m`** — distance to the closest OSM drainage segment,
  measured in EPSG:32643 (UTM 43N) so the answer is in metres, not degrees.
- **`depression_depth_m`** — how far a spot sits below the terrain around it,
  read off the SRTM tile as (90th-percentile rim height − spot elevation)
  within `DEPRESSION_RADIUS_M`. This is the physical reason a place ponds, so
  raw elevation alone is not enough.

## Layer 2 — Features (`ml/feature_engineering.py`)

The rainfall record is **daily**, but flooding is driven by short-burst
intensity. Each daily total is spread across 24 hours under a Gaussian diurnal
curve peaked at `RAIN_PEAK_HOUR` (Mumbai monsoon convection peaks late
afternoon), normalised so the hours sum back to the measured daily total. This
invents no rainfall — it redistributes a real measurement under a documented,
configurable shape.

Negatives are monsoon-season timestamps at real spots, held at least
`NEGATIVE_EXCLUSION_HOURS` away from any real event at that spot, so a
near-miss of a genuine flood is never labelled dry. **No positive label is ever
fabricated** — there are exactly 32, one per documented event.

The same functions serve inference, so training and serving agree by
construction rather than by discipline.

## Layer 3 — The dual model

Model A is deliberately blind to drainage. That blindness is the point: it
establishes what rainfall and terrain alone can account for, so that whatever
Model B adds is attributable to drainage, timing, and live ground truth.

`ml/train_model_b.py` refuses to proceed if Model B fails to beat Model A — a
residual between two equally good models would be noise, and every threshold,
dispatch decision, and maintenance forecast downstream is built on that
residual.

## Layer 4 — Learned thresholds

No operating value in this system is hand-picked.

| Threshold | How it is derived |
|---|---|
| `delta_dispatch` | Youden's J (max TPR − FPR) on Δ against the drain-related label |
| `risk_levels` | quartiles of the test-set `P_actual` distribution |
| `critical_delta` | `CRITICAL_DELTA_PERCENTILE` of observed Δ |

The drain-related label is itself derived — a percentile of the ward's own
`nearest_drain_m` distribution, splitting the 30 spots into drain-served and
drain-starved halves, rather than a metre figure someone picked.

`critical_delta` is measured over the **predictions** population, because that
is the population it is applied to. Measured instead on the 48-row test set it
read 0.124 against a prediction population whose own p90 is 0.514 — which
marked every spot overdue and pinned half the health scores at zero.
`drain_health.main` recalibrates after bootstrapping so a cold clone reproduces
this in a single command.

## Layer 5a — Serve (`backend/`)

FastAPI with async SQLAlchemy. Both models, the SHAP explainer, and both JSON
config files load **once** in the lifespan; building a TreeExplainer per
request would dominate latency. A model-load failure is captured and reported
by `/api/health` as `degraded` rather than crashing the process, so
database-backed endpoints keep serving while models are retrained.

Inference itself is synchronous (psycopg2) and CPU-bound, so it runs in a
worker thread rather than blocking the event loop.

## Layer 5b — Drain health (`drain_health/`)

The novel contribution. Δ at one spot, tracked weekly, trends upward as its
drain silts up — before anyone reports a blockage.

```
predictions ──GROUP BY (spot, year, week)──► avg_delta, max_delta, count
            ──np.polyfit(weeks, avg_delta, 1)──► trend_slope, intercept
            ──solve slope·w + intercept = critical_delta──► failure date
            health_score = 100 × (1 − avg_delta / critical_delta), clipped
```

A spot whose Δ is flat or falling gets **no** failure date; extrapolating one
would be fiction. A spot already past critical reports the date it *crossed* —
returning nothing there would hide precisely the drains most in need of work.
