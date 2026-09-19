# API reference

Base URL `http://localhost:8000` · interactive docs at `/docs`

Every response below is a **real captured response** from the verification run,
not an illustration.

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/api/health` | API, database, and model liveness |
| 2 | GET | `/api/spots` | all 30 spots with latest risk |
| 3 | GET | `/api/spots/{spot_id}` | spot detail + prediction history |
| 4 | POST | `/api/predict` | predict one spot |
| 5 | POST | `/api/predict/all` | predict all 30 spots |
| 6 | GET | `/api/drain-health` | maintenance leaderboard |
| 7 | GET | `/api/drain-health/{spot_id}` | weekly Δ series + trend |
| 8 | POST | `/api/crowd-report` | submit a citizen report |
| 9 | GET | `/api/crowd-reports` | recent citizen reports |
| 10 | POST | `/api/alert/send` | send/simulate a WhatsApp alert |
| 11 | GET | `/api/alerts/log` | alert audit trail |

---

## 1. `GET /api/health`

```bash
curl http://localhost:8000/api/health
```

```json
{"status": "ok", "db": true, "models_loaded": true, "version": "0.1.0", "detail": null}
```

`status` is `degraded` when the database is unreachable or the models failed to
load; `detail` then carries the reason. The endpoint stays up either way — that
is the point of it.

---

## 2. `GET /api/spots`

All 30 spots joined to their most recent prediction, from the `v_latest_risk`
view. Spots never predicted still appear, with null risk fields.

```bash
curl http://localhost:8000/api/spots | jq 'length'   # 30
```

```json
{
  "spot_id": 1,
  "name": "Hindmata Junction",
  "lat": 19.01,
  "lng": 72.842,
  "elevation_m": 15.0,
  "depression_depth_m": 0.6,
  "nearest_drain_m": 376.2960220588791,
  "notes": "BMC-identified chronic; holding pond installed",
  "predicted_for": "2026-09-19T14:51:27.731369Z",
  "p_rain": 0.01271,
  "p_actual": 0.006115,
  "delta": -0.006595,
  "risk_level": "moderate",
  "cause_label": "rainfall_driven",
  "dispatch_type": "pump_and_traffic",
  "confidence_lower": 0.0029,
  "confidence_upper": 0.1025,
  "shap_top3": [
    "..."
  ]
}
```

---

## 3. `GET /api/spots/{spot_id}`

Adds a `history` array. `history_hours` (default 24) is measured back from that
spot's **most recent prediction**, not from now — so a spot last predicted in
the 2025 monsoon still returns its series.

```bash
curl "http://localhost:8000/api/spots/1?history_hours=720" | jq '.history | length'
```

Returns `404` for an unknown spot.

---

## 4. `POST /api/predict`

```bash
curl -X POST http://localhost:8000/api/predict \
     -H "Content-Type: application/json" \
     -d '{"spot_id": 1, "timestamp": "2025-07-15T10:30:00Z"}'
```

`timestamp` is optional and defaults to now (UTC). The example below uses a
real flood date at Hindmata Junction. `features` is also returned but elided
here for length.

```json
{
  "spot_id": 1,
  "spot_name": "Hindmata Junction",
  "predicted_for": "2025-07-15T10:30:00Z",
  "p_rain": 0.751686,
  "p_actual": 0.915377,
  "delta": 0.163692,
  "risk_level": "critical",
  "cause_label": "drainage_failure",
  "dispatch_type": "desilting_crew",
  "confidence_lower": 0.7876,
  "confidence_upper": 0.9635,
  "shap_top3": [
    {
      "feature": "rain_1h",
      "label": "rainfall in the last hour",
      "value": 1.7903,
      "shap_value": 1.703187,
      "direction": "increases_risk"
    },
    {
      "feature": "rain_24h",
      "label": "rainfall in the last 24 hours",
      "value": 32.3494,
      "shap_value": 1.55706,
      "direction": "increases_risk"
    },
    {
      "feature": "hour_of_day",
      "label": "hour of day",
      "value": 16.0,
      "shap_value": 0.936519,
      "direction": "increases_risk"
    }
  ],
  "prediction_id": 4682
}
```

| Field | Meaning |
|---|---|
| `p_rain` | Model A — probability from rainfall and terrain alone |
| `p_actual` | Model B — probability given drainage, timing, crowd signal |
| `delta` | `p_actual − p_rain`; risk the rainfall does not explain |
| `risk_level` | `low` / `moderate` / `high` / `critical` (learned quartiles) |
| `cause_label` | `rainfall_driven` or `drainage_failure` (Youden's J cut) |
| `dispatch_type` | `pump_and_traffic` or `desilting_crew` |
| `confidence_lower/upper` | Beta-posterior credible interval |
| `shap_top3` | the 3 strongest drivers, each with direction |

Every served prediction is also written to `predictions`, which is what feeds
`v_latest_risk` and the weekly Δ series behind drain health.

Returns `404` for an unknown spot, `503` if the models are not loaded.

---

## 5. `POST /api/predict/all`

Same shape, as an array of 30. Body is optional; `{"timestamp": ...}` applies
one instant to every spot.

```bash
curl -X POST http://localhost:8000/api/predict/all \
     -H "Content-Type: application/json" -d '{}' | jq 'length'   # 30
```

---

## 6. `GET /api/drain-health`

Leaderboard sorted by `health_score` **ascending** — worst drain first, because
that is where a crew should go. Optional `?limit=`.

```json
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
}
```

`status` is `overdue` (crossing date already passed), `degrading` (slope above
`SLOPE_EPSILON`), `improving`, or `stable`. Slopes within epsilon of zero read
as stable rather than dressing up noise as degradation.

---

## 7. `GET /api/drain-health/{spot_id}`

Adds the full `weekly` array (`year`, `week_number`, `week_start`, `avg_delta`,
`max_delta`, `prediction_count`, `health_score`) plus `trend_slope`,
`trend_intercept`, `predicted_failure_date`, and the learned `critical_delta`
the trend extrapolates toward.

```bash
curl http://localhost:8000/api/drain-health/1 | jq '.weekly | length'   # 53
```

Returns `404` when the spot has no history — run `python -m drain_health.main`.

---

## 8. `POST /api/crowd-report`

```bash
curl -X POST http://localhost:8000/api/crowd-report \
     -H "Content-Type: application/json" \
     -d '{"lat": 19.010, "lng": 72.842, "severity": "knee-deep", "language": "en"}'
```

```json
{
  "id": 1, "reported_at": "2026-09-19T14:51:18.652878Z",
  "lat": 19.01, "lng": 72.842, "severity": "knee-deep", "note": null,
  "language": "en", "spot_id": 1, "spot_name": "Hindmata Junction",
  "distance_m": 0.0, "matched": true
}
```

`201 Created`. PostGIS snaps the report to the nearest spot within
`CROWD_RADIUS_M`. A report outside every radius is **still stored**, with
`matched: false` and a null `spot_id` — it may be a flooding location BMC has
not listed.

---

## 9. `GET /api/crowd-reports`

`?hours=` (default 24) and `?limit=` (default 100), newest first.

---

## 10. `POST /api/alert/send`

```bash
curl -X POST http://localhost:8000/api/alert/send \
     -H "Content-Type: application/json" \
     -d '{"spot_id": 1, "language": "mr"}'
```

Predicts first, so the message always carries current risk. `language` is one
of `en` / `hi` / `hinglish` / `mr` (falls back to `DEFAULT_LANGUAGE`);
`recipient` defaults to `ALERT_DEFAULT_RECIPIENT`.

```json
{
  "id": 1, "spot_id": 1, "spot_name": "Hindmata Junction",
  "language": "en", "recipient": "whatsapp:+910000000000",
  "channel": "whatsapp", "status": "simulated",
  "provider_sid": null, "error": null,
  "body": "*WardAlert — Hindmata Junction*\n\nFlood risk: *MODERATE* …",
  "sent_at": "2026-09-19T14:52:03.118Z"
}
```

`status` is `sent` when Twilio credentials are configured, `simulated` when
they are not, and `failed` (with `error`) if Twilio rejected it. A failed send
is recorded rather than raised, so it stays auditable.

---

## 11. `GET /api/alerts/log`

`?limit=` (default 50), newest first — the full audit trail including simulated
and failed sends.

---

## Status codes

| Code | When |
|---|---|
| `200` | success |
| `201` | crowd report created |
| `404` | unknown `spot_id`, or no drain-health history for it |
| `422` | request body failed Pydantic validation |
| `503` | models not loaded — train them, then restart the API |
