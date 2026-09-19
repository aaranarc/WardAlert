"""Load the 30 BMC-identified chronic flood spots, building POINT geometry."""
from __future__ import annotations

import csv

from config import Config
from data_loader.db import cursor


def _maybe_float(value: str | None) -> float | None:
    if value is None or value.strip() == "":
        return None
    return float(value)


def load() -> int:
    with Config.FLOOD_SPOTS_FILE.open(newline="", encoding="utf-8") as handle:
        records = list(csv.DictReader(handle))

    rows = 0
    with cursor() as cur:
        for rec in records:
            lat = float(rec["lat"])
            lng = float(rec["lng"])
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
                    int(rec["id"]),
                    rec["name"].strip(),
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
