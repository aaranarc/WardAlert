"""Load the real BMC Ward G/South polygon into ward_boundary."""
from __future__ import annotations

import json

from config import Config
from data_loader.db import cursor


def load() -> int:
    payload = json.loads(Config.WARD_BOUNDARY_FILE.read_text())
    features = payload["features"] if payload.get("type") == "FeatureCollection" else [payload]

    rows = 0
    with cursor() as cur:
        for feature in features:
            props = feature.get("properties") or {}
            ward_name = props.get("name") or Config.WARD_NAME
            geom_json = json.dumps(feature["geometry"])
            cur.execute(
                """
                INSERT INTO ward_boundary (ward_name, geom, area_sqkm)
                VALUES (
                    %s,
                    ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), %s)),
                    ST_Area(
                        ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(%s), %s), %s)
                    ) / 1e6
                )
                ON CONFLICT (ward_name) DO UPDATE
                   SET geom      = EXCLUDED.geom,
                       area_sqkm = EXCLUDED.area_sqkm
                """,
                (ward_name, geom_json, Config.SRID, geom_json, Config.SRID, Config.METRIC_SRID),
            )
            rows += 1
    return rows


if __name__ == "__main__":
    print(f"ward_boundary: {load()} row(s) upserted")
