# Feature status — working / simulation / planned

Read this before demoing. It states plainly what runs on real data, what is
simulated, and what is not built.

## ✅ Working on real data

| Feature | Evidence |
|---|---|
| PostGIS schema, 10 tables + `v_latest_risk` | `database/init.sql`; created on `docker compose up` |
| Idempotent data loading | 30 / 54 / 1096 / 32 / 1 rows; re-runs cleanly |
| Label matching | 32/32 events matched at similarity 1.000 |
| Derived spatial features | `nearest_drain_m` 22.8–1702.2 m; `depression_depth_m` 0–18.8 m |
| Feature engineering | 192 snapshots (32 real positives, 160 sampled negatives) |
| Model A (rain-only) | test AUC **0.8187** |
| Model B (full context) | test AUC **0.8500**, F1 0.50 vs A's 0.29 |
| Dual-model residual Δ | Model B beats A by +0.0313; training aborts if it does not |
| Learned thresholds | Youden's J (J = 0.269), quartiles, p90 — `thresholds.json` |
| SHAP explanations | top 3 drivers with direction, per prediction |
| Bayesian confidence | Beta posterior credible interval |
| Drain health index | 4650 predictions → 1590 weekly rows → 30 trends fitted |
| All 11 API endpoints | see `docs/verification_run.md` |
| 4-language alert templates | en / hi / hinglish / mr, fully localised |

## ⚠️ Simulation / partial

| Feature | What is real | What is not |
|---|---|---|
| **Crowd reports** | schema, PostGIS radius matching, the `crowd_reports_500m_2h` feature, both endpoints | No live citizen channel. The feature is **0 for every historical training row**, so Model B currently gains nothing from it — its value appears only once real reports flow. |
| **WhatsApp alerts** | composition, 4 languages, `alerts_sent` audit trail, Twilio client wired | Without `TWILIO_ACCOUNT_SID` nothing is transmitted; messages log as `simulated`. |
| **Hourly rainfall** | daily totals are real and measured | Within-day distribution is a modelled Gaussian curve, not observed sub-daily data. |
| **SRTM coverage** | 25 of 30 spots fully covered | 5 spots south of 19.0°N use an edge-clamped window (tile N18E072 absent). Reported on every loader run. |
| **Negative labels** | timestamps are real monsoon hours | "No flood occurred" is inferred from absence of a report, not from an observation. |
| **Drain health trends** | method, fit, and extrapolation are sound | Fitted on **model output**, not measured drain condition. No ground-truth desilting record exists to validate a predicted failure date against. |

## ❌ Planned / not built

| Feature | Why it matters | Notes |
|---|---|---|
| **Live + forecast rainfall** | Highest-value gap. The record ends 31 Dec 2025, so a prediction for today sees `rain_* = 0`. | Open-Meteo forecast API; `RainfallSeries` is the single insertion point. |
| **Sub-daily observed rainfall** | Would replace the biggest modelling assumption with measurement. | BMC AWS gauges or Open-Meteo hourly. |
| **Inbound WhatsApp** | Would make crowd reports real and switch on the crowd feature. | Twilio webhook → `POST /api/crowd-report`. |
| **Authentication** | All endpoints are currently open. | Not suitable for public deployment as-is. |
| **Scheduled prediction job** | Predictions run on request, not on a timer. | Cron/worker calling `/api/predict/all`. |
| **Automated tests** | Verification is currently a manual documented run. | pytest over loaders, features, thresholds, endpoints. |
| **Validation against a held-out year** | Current split is random-stratified, not temporal. | A 2025-holdout run would be a stronger honesty check. |
| **Frontend** | Backend only in this branch. | 11 endpoints + Swagger are the contract. |

---

## Honest limitations

1. **32 positive events is a small training set.** AUC 0.85 on 8 test positives
   carries real variance. The Beta-posterior confidence interval is in the API
   precisely so this uncertainty is visible rather than hidden.

2. **Drain health is validated on method, not outcome.** The trends are real and
   the maths is sound, but no record of actual desilting exists to check a
   predicted failure date against. It should be presented as a prioritisation
   signal, not a guarantee.

3. **The crowd feature is currently inert.** It is fully built and contributes
   nothing yet, because there is no data flowing into it.

4. **Predictions "now" are not meaningful** until live rainfall is connected.
   Demo against historical monsoon timestamps — e.g. `2025-07-15T10:30:00Z` at
   Hindmata Junction, a real flood moment.
