-- ===========================================================================
-- WardAlert schema — Ward G/South hyperlocal flood prediction
--
-- Applied automatically by docker-compose on first boot of an empty volume.
-- Safe to re-run by hand: every object uses IF NOT EXISTS / CREATE OR REPLACE.
--   docker exec -i wardalert-db-1 psql -U wardalert -d wardalert < database/init.sql
--
-- Conventions:
--   * all timestamps are TIMESTAMPTZ (data is stored UTC, presented IST)
--   * all geometry is EPSG:4326; metric work reprojects to EPSG:32643 (UTM 43N)
--   * every geometry column carries a GIST index
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- --------------------------------------------------------------------------
-- 1. ward_boundary — the real BMC G/South polygon
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ward_boundary (
    id          SERIAL PRIMARY KEY,
    ward_name   TEXT NOT NULL UNIQUE,
    geom        geometry(MultiPolygon, 4326) NOT NULL,
    area_sqkm   DOUBLE PRECISION,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ward_boundary_geom ON ward_boundary USING GIST (geom);

-- --------------------------------------------------------------------------
-- 2. flood_spots — 30 BMC-identified chronic flooding locations
--    elevation_m / depression_depth_m come from the SRTM tile,
--    nearest_drain_m is computed by data_loader.compute_spatial_features.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flood_spots (
    id                 INTEGER PRIMARY KEY,
    name               TEXT NOT NULL UNIQUE,
    lat                DOUBLE PRECISION NOT NULL,
    lng                DOUBLE PRECISION NOT NULL,
    geom               geometry(Point, 4326) NOT NULL,
    notes              TEXT,
    elevation_m        DOUBLE PRECISION,
    depression_depth_m DOUBLE PRECISION,
    nearest_drain_m    DOUBLE PRECISION,
    nearest_drain_id   INTEGER,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flood_spots_geom ON flood_spots USING GIST (geom);

-- --------------------------------------------------------------------------
-- 3. drainage_segments — 54 OSM drain/ditch lines (osm_id preserved)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drainage_segments (
    id           INTEGER PRIMARY KEY,
    osm_id       BIGINT UNIQUE,
    name         TEXT,
    drain_type   TEXT,
    length_m     DOUBLE PRECISION,
    geom         geometry(LineString, 4326) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drainage_segments_geom ON drainage_segments USING GIST (geom);

-- --------------------------------------------------------------------------
-- 4. rainfall_daily — 1096 days of CHIRPS/ERA5 rainfall via Open-Meteo
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rainfall_daily (
    date         DATE PRIMARY KEY,
    rainfall_mm  DOUBLE PRECISION NOT NULL,
    source       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 5. flood_events — 32 real observed floods, the positive training labels.
--    spot_id is filled by fuzzy name matching (ml/label_matching.py);
--    the raw spot_name is kept so an unmatched event is never lost.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flood_events (
    id            SERIAL PRIMARY KEY,
    event_ts      TIMESTAMPTZ NOT NULL,
    spot_name     TEXT NOT NULL,
    spot_id       INTEGER REFERENCES flood_spots (id) ON DELETE SET NULL,
    match_score   DOUBLE PRECISION,
    severity      TEXT,
    source        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_ts, spot_name)
);
CREATE INDEX IF NOT EXISTS idx_flood_events_spot ON flood_events (spot_id);
CREATE INDEX IF NOT EXISTS idx_flood_events_ts   ON flood_events (event_ts);

-- --------------------------------------------------------------------------
-- 6. feature_snapshots — the training matrix (one row per spot × timestamp)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_snapshots (
    id                    SERIAL PRIMARY KEY,
    spot_id               INTEGER NOT NULL REFERENCES flood_spots (id) ON DELETE CASCADE,
    snapshot_ts           TIMESTAMPTZ NOT NULL,
    rain_1h               DOUBLE PRECISION,
    rain_3h               DOUBLE PRECISION,
    rain_24h              DOUBLE PRECISION,
    antecedent_moisture   DOUBLE PRECISION,
    elevation_m           DOUBLE PRECISION,
    depression_depth_m    DOUBLE PRECISION,
    drain_distance_m      DOUBLE PRECISION,
    monsoon_week          INTEGER,
    hour_of_day           INTEGER,
    crowd_reports_500m_2h INTEGER NOT NULL DEFAULT 0,
    crowd_weighted_score  DOUBLE PRECISION NOT NULL DEFAULT 0,
    drain_related         BOOLEAN,
    flooded               SMALLINT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (spot_id, snapshot_ts)
);
CREATE INDEX IF NOT EXISTS idx_feature_snapshots_flooded ON feature_snapshots (flooded);

-- --------------------------------------------------------------------------
-- 7. predictions — every inference the API or the bootstrap run produced
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictions (
    id               SERIAL PRIMARY KEY,
    spot_id          INTEGER NOT NULL REFERENCES flood_spots (id) ON DELETE CASCADE,
    predicted_for    TIMESTAMPTZ NOT NULL,
    p_rain           DOUBLE PRECISION NOT NULL,
    p_actual         DOUBLE PRECISION NOT NULL,
    delta            DOUBLE PRECISION NOT NULL,
    risk_level       TEXT NOT NULL,
    cause_label      TEXT NOT NULL,
    dispatch_type    TEXT,
    confidence_lower DOUBLE PRECISION,
    confidence_upper DOUBLE PRECISION,
    shap_top3        JSONB,
    features         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (spot_id, predicted_for)
);
CREATE INDEX IF NOT EXISTS idx_predictions_spot_time ON predictions (spot_id, predicted_for DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_created   ON predictions (created_at DESC);

-- --------------------------------------------------------------------------
-- 8. crowd_reports — citizen submissions, snapped to the nearest spot
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crowd_reports (
    id            SERIAL PRIMARY KEY,
    reported_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    lat           DOUBLE PRECISION NOT NULL,
    lng           DOUBLE PRECISION NOT NULL,
    geom          geometry(Point, 4326) NOT NULL,
    severity      TEXT,
    note          TEXT,
    language      TEXT,
    reporter_ref  TEXT,
    spot_id       INTEGER REFERENCES flood_spots (id) ON DELETE SET NULL,
    distance_m    DOUBLE PRECISION,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crowd_reports_geom ON crowd_reports USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_crowd_reports_time ON crowd_reports (reported_at DESC);

-- --------------------------------------------------------------------------
-- 9. drain_health_weekly — weekly Δ aggregation + fitted trend + forecast
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drain_health_weekly (
    id                     SERIAL PRIMARY KEY,
    spot_id                INTEGER NOT NULL REFERENCES flood_spots (id) ON DELETE CASCADE,
    year                   INTEGER NOT NULL,
    week_number            INTEGER NOT NULL,
    week_start             DATE,
    avg_delta              DOUBLE PRECISION NOT NULL,
    max_delta              DOUBLE PRECISION NOT NULL,
    prediction_count       INTEGER NOT NULL,
    trend_slope            DOUBLE PRECISION,
    trend_intercept        DOUBLE PRECISION,
    predicted_failure_date DATE,
    health_score           DOUBLE PRECISION,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (spot_id, year, week_number)
);
CREATE INDEX IF NOT EXISTS idx_drain_health_spot ON drain_health_weekly (spot_id, year, week_number);

-- --------------------------------------------------------------------------
-- 10. alerts_sent — Twilio deliveries and simulated fallbacks
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts_sent (
    id            SERIAL PRIMARY KEY,
    spot_id       INTEGER REFERENCES flood_spots (id) ON DELETE SET NULL,
    prediction_id INTEGER REFERENCES predictions (id) ON DELETE SET NULL,
    language      TEXT NOT NULL,
    recipient     TEXT,
    channel       TEXT NOT NULL DEFAULT 'whatsapp',
    status        TEXT NOT NULL,          -- sent | simulated | failed
    provider_sid  TEXT,
    error         TEXT,
    body          TEXT NOT NULL,
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_time ON alerts_sent (sent_at DESC);

-- --------------------------------------------------------------------------
-- v_latest_risk — one row per spot carrying its most recent prediction.
-- Spots that have never been predicted still appear (LEFT JOIN), so
-- GET /api/spots always returns all 30.
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_latest_risk AS
SELECT
    s.id            AS spot_id,
    s.name,
    s.lat,
    s.lng,
    s.elevation_m,
    s.depression_depth_m,
    s.nearest_drain_m,
    s.notes,
    p.predicted_for,
    p.p_rain,
    p.p_actual,
    p.delta,
    p.risk_level,
    p.cause_label,
    p.dispatch_type,
    p.confidence_lower,
    p.confidence_upper,
    p.shap_top3
FROM flood_spots s
LEFT JOIN LATERAL (
    SELECT *
    FROM predictions pr
    WHERE pr.spot_id = s.id
    ORDER BY pr.predicted_for DESC
    LIMIT 1
) p ON TRUE
ORDER BY s.id;
