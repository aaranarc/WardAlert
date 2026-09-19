# Verification run

Recorded **19 September 2026**, from a **cold rebuild**: the Docker volume was
destroyed and both `.joblib` files deleted, then the entire pipeline was re-run
from the committed data. Every figure below is captured output, not a
transcription.

Environment: macOS (arm64), Python 3.11.15, PostGIS 16-3.4.
`POSTGRES_PORT=5434` — 5432 was occupied by a system PostgreSQL on this machine.

## Reproducibility

The cold rebuild reproduced the previously recorded AUCs **exactly** (0.8187 /
0.8500), confirming that `RANDOM_SEED` pins the split and both models, and that
nothing depends on accumulated database state.

---

## Row counts

```
$ docker exec -i wardalert-db-1 psql -U wardalert -d wardalert -c "
    SELECT 'flood_spots' AS t, COUNT(*) FROM flood_spots
    UNION ALL SELECT 'drainage_segments', COUNT(*) FROM drainage_segments
    UNION ALL SELECT 'rainfall_daily', COUNT(*) FROM rainfall_daily
    UNION ALL SELECT 'flood_events', COUNT(*) FROM flood_events
    UNION ALL SELECT 'feature_snapshots', COUNT(*) FROM feature_snapshots
    UNION ALL SELECT 'predictions', COUNT(*) FROM predictions
    UNION ALL SELECT 'drain_health_weekly', COUNT(*) FROM drain_health_weekly;"
```

```
---------------------+-------
 flood_spots         |    30
 drainage_segments   |    54
 rainfall_daily      |  1096
 flood_events        |    32
 feature_snapshots   |   192
 predictions         |  4650
 drain_health_weekly |  1590
(7 rows)

```

| Table | Expected | Actual | |
|---|---|---|---|
| `flood_spots` | 30 | **30** | ✅ |
| `drainage_segments` | 54 | **54** | ✅ |
| `rainfall_daily` | 1096 | **1096** | ✅ |
| `flood_events` | 32 | **32** | ✅ |
| `feature_snapshots` | ≥ 150 | **192** | ✅ |
| `predictions` | ≥ 300 | **4650** | ✅ |
| `drain_health_weekly` | ≥ 100 | **1590** | ✅ |

All 32 flood events matched to a spot (similarity 1.000); none unmatched.

---

## Model performance

| | Model A (rain-only) | Model B (full context) |
|---|---|---|
| **AUC** | **0.8187** | **0.8500** |
| Average precision | 0.4291 | 0.4582 |
| Precision @0.5 | 0.3333 | 0.5000 |
| Recall @0.5 | 0.2500 | 0.5000 |
| F1 @0.5 | 0.2857 | 0.5000 |

Test set: 48 rows, 8 positive. **Lift +0.0313 AUC**, F1 nearly doubled — both
gate conditions pass (Model A ≥ 0.60; Model B > Model A).

## Learned thresholds

```
delta_dispatch   -0.0021   Youden's J = 0.2692 (26/48 drain-related)
critical_delta    0.5135   p90 of Δ over 4650 prediction rows
risk bands        low 0.0000–0.0048 · moderate 0.0048–0.0165
                  high 0.0165–0.1242 · critical 0.1242–1.0000
Δ range          -0.5673 .. 0.5829 (mean 0.0188)
```

The cold run first emitted `critical_delta = 0.1240` from the 48-row test set,
then `drain_health.main` recalibrated it to 0.5135 over the 4650-row prediction
population it is actually applied to — the documented two-pass behaviour.

## Drain health

```
155 timestamps (3/week) x 30 spots = 4650 predictions
1590 weekly rows · 30/30 spots fitted · 0 skipped
1590 rows scored, 106 with a crossing date (0 overdue)
```

---

## Endpoints

```
### curl http://localhost:8000/api/health
{
    "status": "ok",
    "db": true,
    "models_loaded": true,
    "version": "0.1.0",
    "detail": null
}

### curl http://localhost:8000/api/spots | jq 'length'
30

### curl -X POST /api/predict -d '{"spot_id": 1}'
{
    "spot_id": 1,
    "spot_name": "Hindmata Junction",
    "predicted_for": "2026-09-19T14:57:16.036989Z",
    "p_rain": 0.01271,
    "p_actual": 0.006115,
    "delta": -0.006595,
    "risk_level": "moderate",
    "cause_label": "rainfall_driven",
    "dispatch_type": "pump_and_traffic",
    "confidence_lower": 0.0029,
    "confidence_upper": 0.1025,
    "shap_top3": [
        {
            "feature": "rain_1h",
            "label": "rainfall in the last hour",
            "value": 0.0,
            "shap_value": -1.619693,
            "direction": "decreases_risk"
        },
        {
            "feature": "hour_of_day",
            "label": "hour of day",
            "value": 20.0,
            "shap_value": -1.05623,
            "direction": "decreases_risk"
        },
        {
            "feature": "rain_24h",
            "label": "rainfall in the last 24 hours",
            "value": 0.0,
            "shap_value": -0.779043,
            "direction": "decreases_risk"
        }
    ],
    "features": {
        "rain_1h": 0.0,
        "rain_3h": 0.0,
        "rain_24h": 0.0,
        "antecedent_moisture": 0.0,
        "elevation_m": 15.0,
        "depression_depth_m": 0.6,
        "drain_distance_m": 376.2960220588791,
        "monsoon_week": 16,
        "hour_of_day": 20,
        "crowd_reports_500m_2h": 0,
        "crowd_weighted_score": 0
    },
    "prediction_id": 4651
}
```

```
### curl http://localhost:8000/api/drain-health | jq '.[:3]'
[
  {
    "spot_id": 27,
    "name": "Mahalaxmi Racecourse Rd",
    "lat": 18.983,
    "lng": 72.814,
    "health_score": 54.55,
    "avg_delta": 0.239146,
    "max_delta": 0.680227,
    "weeks_tracked": 53,
    "prediction_count": 155,
    "trend_slope": 0.0004908576511963366,
    "predicted_failure_date": null,
    "status": "degrading"
  },
  {
    "spot_id": 7,
    "name": "Parel TT",
    "lat": 19.003,
    "lng": 72.837,
    "health_score": 55.02,
    "avg_delta": 0.239644,
    "max_delta": 0.732115,
    "weeks_tracked": 53,
    "prediction_count": 155,
    "trend_slope": 0.0007122582262289067,
    "predicted_failure_date": "2031-12-27",
    "status": "degrading"
  },
  {
    "spot_id": 8,
    "name": "Love Grove Junction",
    "lat": 19.014,
    "lng": 72.822,
    "health_score": 56.61,
    "avg_delta": 0.232424,
    "max_delta": 0.755001,
    "weeks_tracked": 53,
    "prediction_count": 155,
    "trend_slope": 0.0006334396296309268,
    "predicted_failure_date": null,
    "status": "degrading"
  }
]
```

### Full endpoint sweep

| Endpoint | Result |
|---|---|
| `GET /api/health` | `status: ok`, `db: true`, **`models_loaded: true`** ✅ |
| `GET /api/spots` | **30** spots ✅ |
| `GET /api/spots/1` | `200` |
| `POST /api/predict` | full JSON, **3-element SHAP array** ✅ |
| `POST /api/predict/all` | **30** predictions ✅ |
| `GET /api/drain-health` | **3 spots returned** for `.[:3]` ✅ |
| `GET /api/drain-health/1` | `200`, 53 weekly points |
| `POST /api/crowd-report` | `201`, snapped to Hindmata Junction at 0.0 m |
| `GET /api/crowd-reports` | 1 report |
| `POST /api/alert/send` | `simulated` (no Twilio credentials) |
| `GET /api/alerts/log` | 1 entry |

**All 11 endpoints verified.**

---

## Note on the `/api/predict` sample above

The unqualified `{"spot_id": 1}` call predicts for *now* — 19 Sep 2026 — which
is past the end of the rainfall record (31 Dec 2025). All `rain_*` features are
therefore 0 and the probability is correspondingly low. This is the documented
live-rainfall gap (`docs/feature_status.md`), not a fault in the model.

Against a real flood moment the system responds as intended:

```bash
curl -X POST http://localhost:8000/api/predict \
     -H "Content-Type: application/json" \
     -d '{"spot_id": 1, "timestamp": "2025-07-15T10:30:00Z"}'
```

```
p_rain 0.7517 · p_actual 0.9154 · Δ +0.1637
risk critical · drainage_failure · desilting_crew
CI 0.7876 – 0.9635 · rain_3h 5.1 mm · rain_24h 32.3 mm
```

Hindmata Junction on 15 July 2025 — a documented flood date in the training
data's event record.
