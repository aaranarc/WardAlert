# Data provenance — what is real, what is derived, what is simulated

This document exists so nothing in a demo is mistaken for something it is not.

## Summary

| Layer | Status |
|---|---|
| Flood spots, rainfall, drainage, events, ward boundary, elevation | **Real public data** |
| `nearest_drain_m`, `depression_depth_m`, hourly rainfall, drain-related label | **Derived** from real data by documented method |
| Negative training samples | **Sampled** from real monsoon timestamps |
| Crowd reports | **Simulated** — no live citizen channel yet |
| WhatsApp delivery | **Simulated** unless Twilio credentials are set |
| Live/forecast rainfall | **Not implemented** — record ends Dec 2025 |

---

## 1. Real data (committed under `data/`)

### `flood_spots_gsouth.csv` — 30 rows
Chronic flooding locations identified by the **Brihanmumbai Municipal
Corporation** for Ward G/South, geocoded to lat/lng. `elevation_m` is
SRTM-derived. Columns: `id, name, lat, lng, notes, elevation_m`.

### `rainfall_daily_gsouth.csv` — 1096 rows
Daily rainfall, 1 Jan 2023 – 31 Dec 2025, from **CHIRPS/ERA5 reanalysis via the
Open-Meteo API** for the G/South centroid. This is measured/reanalysis data,
not a forecast.

### `drainage_gsouth.geojson` — 54 features
Drain and ditch lines from **OpenStreetMap** (© OpenStreetMap contributors,
ODbL), clipped to the ward. Upstream `osm_id` is preserved.

> The 54 segments are sections cut from only **10** distinct OSM ways, so
> `osm_id` is deliberately not unique in the schema. The segment `id` is the
> natural key. A UNIQUE constraint on `osm_id` rejected the initial load.

### `flood_events_gsouth.csv` — 32 rows
Documented flood occurrences with date, time, spot name, severity, and source
— from **BMC records and Mumbai news archives**. These are the **only**
positive training labels, and none were fabricated.

All 32 matched to a flood spot at similarity **1.000** (`python -m
ml.label_matching`). An event that failed to match would be stored with a null
`spot_id` and reported, never silently dropped.

### `ward_gsouth_boundary.geojson` — 1 MultiPolygon
The real **BMC** administrative boundary for Ward G/South.

### `N19E072.hgt` — SRTM 30m tile
**NASA SRTM** elevation, covering 19–20°N, 72–73°E.

> **Known coverage gap.** Five spots — Currey Road, NM Joshi Marg, Curry Road
> Bridge Approach, Mahalaxmi Racecourse Rd, and Haji Ali Junction — lie at
> latitudes 18.983–18.998, just **south of the tile's edge**. They would need
> tile N18E072, which is not in the dataset. For these, the DEM sampling window
> is clamped to the tile's southern edge and the spot's own CSV elevation is
> used as the centre height. The loader prints this on every run. It is an
> approximation, and it is never presented as full coverage.

---

## 2. Derived from real data

These are computed, not measured. Each has a documented method and is
reproducible from the committed inputs.

| Value | Method |
|---|---|
| `nearest_drain_m` | PostGIS distance from spot to closest drainage segment, in EPSG:32643 (metres) |
| `depression_depth_m` | 90th-percentile elevation within `DEPRESSION_RADIUS_M` minus the spot's elevation, from SRTM |
| `rain_1h` / `rain_3h` / `rain_24h` | Daily totals spread over 24h under a Gaussian curve peaked at `RAIN_PEAK_HOUR`, normalised back to the measured daily total |
| `antecedent_moisture` | Exponentially-decayed sum over the prior `ANTECEDENT_DAYS` |
| `drain_related` | Spot's `nearest_drain_m` below a percentile of the ward's own distribution (778 m at p50) |

**On hourly rainfall.** The source is daily; flooding is driven by short-burst
intensity. The disaggregation invents no rainfall — it redistributes a real
measured total under a fixed, configurable shape, and the same curve is applied
at training and serving time. It remains an assumption about *within-day*
timing, and sub-daily rainfall is the single highest-value data upgrade
available to this project.

**On the drain-related label.** Originally a hand-picked 120 m, which labelled
only 1 of 32 events drain-related and made the Youden's J fit degenerate. It is
now the median of the ward's own `nearest_drain_m` distribution, giving a
19/13 split.

---

## 3. Sampled

**160 negative training samples.** Drawn from real monsoon-season timestamps at
real spots, each held at least `NEGATIVE_EXCLUSION_HOURS` (48) from any
documented event at that spot, so a near-miss of a real flood is never labelled
dry. The timestamps are real; the *absence of flooding* at them is an
assumption — the data records floods that were reported, and an unreported
minor flood would appear here as a negative.

**4650 bootstrap predictions.** Model output, not observations, generated
across monsoon 2023–2025 so drain health has a trend to fit. They are
predictions the system stands behind, but they are not measurements.

---

## 4. Simulated

**Crowd reports.** The schema, PostGIS matching, and the
`crowd_reports_500m_2h` feature are fully built and working. There is no live
citizen channel, so the table is empty except for test submissions, and that
feature is **0 for every historical training row**. Model B therefore currently
derives no benefit from it — its contribution would appear only once real
reports flow.

**WhatsApp delivery.** With `TWILIO_ACCOUNT_SID` set, messages send through
Twilio. Without it, they are composed identically and logged with status
`simulated`. Nothing in the demo path sends a real message unless credentials
are configured.

---

## 5. Not implemented

**Live and forecast rainfall.** The record ends 31 December 2025. A prediction
requested for a date beyond it sees `rain_* = 0` and returns a correspondingly
low probability. This is why predictions in the verification run were taken at
historical monsoon timestamps. Connecting the Open-Meteo forecast API is the
first item in `docs/feature_status.md`.

---

## Attribution

- Ward boundary, flood spots, flood events — Brihanmumbai Municipal Corporation
- Drainage network — OpenStreetMap contributors (ODbL)
- Rainfall — CHIRPS / ERA5 reanalysis via Open-Meteo
- Elevation — NASA SRTM 30m
- Event corroboration — Mumbai news archives, 2023–2025
