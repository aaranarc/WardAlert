"""Load the 54 OSM drainage segments, preserving their upstream osm_id."""
from __future__ import annotations

import json

from config import Config
from data_loader.db import cursor


def load() -> int:
    payload = json.loads(Config.DRAINAGE_FILE.read_text())
    features = payload["features"]

    rows = 0
    with cursor() as cur:
        for feature in features:
            props = feature.get("properties") or {}
            cur.execute(
                """
                INSERT INTO drainage_segments (id, osm_id, name, drain_type, length_m, geom)
                VALUES (%s, %s, %s, %s, %s,
                        ST_SetSRID(ST_GeomFromGeoJSON(%s), %s))
                ON CONFLICT (id) DO UPDATE
                   SET osm_id     = EXCLUDED.osm_id,
                       name       = EXCLUDED.name,
                       drain_type = EXCLUDED.drain_type,
                       length_m   = EXCLUDED.length_m,
                       geom       = EXCLUDED.geom
                """,
                (
                    props["id"],
                    props.get("osm_id"),
                    props.get("name"),
                    props.get("type"),
                    props.get("length_m"),
                    json.dumps(feature["geometry"]),
                    Config.SRID,
                ),
            )
            rows += 1
    return rows


if __name__ == "__main__":
    print(f"drainage_segments: {load()} row(s) upserted")
