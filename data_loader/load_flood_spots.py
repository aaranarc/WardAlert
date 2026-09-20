"""Load the 30 BMC-identified chronic flood spots, building POINT geometry."""
from __future__ import annotations

import csv

from config import Config
from data_loader.db import cursor


import logging

logger = logging.getLogger("wardalert.data_loader.flood_spots")


def _maybe_float(value: str | None) -> float | None:
    if value is None or value.strip() == "":
        return None
    return float(value)


def load() -> int:
    with Config.FLOOD_SPOTS_FILE.open(newline="", encoding="utf-8") as handle:
        records = list(csv.DictReader(handle))

    rows = 0
    with cursor() as cur:
        # Check ward boundary availability for validation
        cur.execute(
            """
            SELECT geom FROM ward_boundary
            WHERE ward_name = %s OR ward_name = 'G/S'
            LIMIT 1
            """,
            (Config.WARD_NAME,),
        )
        ward_row = cur.fetchone()
        has_boundary = ward_row is not None and ward_row[0] is not None

        for rec in records:
            lat = float(rec["lat"])
            lng = float(rec["lng"])
            spot_id = int(rec["id"])
            spot_name = rec["name"].strip()

            # Validator: run PostGIS ST_Within(location, ward_polygon)
            if has_boundary:
                cur.execute(
                    """
                    SELECT ST_Within(
                        ST_SetSRID(ST_MakePoint(%s, %s), %s),
                        (SELECT geom FROM ward_boundary WHERE ward_name = %s OR ward_name = 'G/S' LIMIT 1)
                    )
                    """,
                    (lng, lat, Config.SRID, Config.WARD_NAME),
                )
                within_res = cur.fetchone()
                is_within = bool(within_res and within_res[0])
                if not is_within:
                    warn_msg = f"WARN: Spot #{spot_id} '{spot_name}' ({lat}, {lng}) is NOT inside ward polygon — skipping"
                    logger.warning(warn_msg)
                    print(warn_msg)
                    continue

            cur.execute(
                """
                INSERT INTO flood_spots (id, name, lat, lng, geom, notes, elevation_m)
                VALUES (%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), %s), %s, %s)
                ON CONFLICT (id) DO UPDATE
                   SET name        = EXCLUDED.name,
                       lat         = EXCLUDED.lat,
                       lng         = EXCLUDED.lng,
                       geom        = EXCLUDED.geom,
                       notes       = EXCLUDED.notes,
                       elevation_m = EXCLUDED.elevation_m,
                       updated_at  = now()
                """,
                (
                    spot_id,
                    spot_name,
                    lat,
                    lng,
                    lng,  # ST_MakePoint takes (x=lng, y=lat)
                    lat,
                    Config.SRID,
                    rec.get("notes"),
                    _maybe_float(rec.get("elevation_m")),
                ),
            )
            rows += 1
    return rows


if __name__ == "__main__":
    print(f"flood_spots: {load()} row(s) upserted")

