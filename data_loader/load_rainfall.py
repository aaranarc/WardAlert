"""Bulk-load 1096 daily rainfall records (CHIRPS/ERA5 via Open-Meteo)."""
from __future__ import annotations

import csv
from datetime import date

from psycopg2.extras import execute_values

from config import Config
from data_loader.db import cursor

SOURCE = "Open-Meteo (CHIRPS/ERA5 reanalysis)"


def load() -> int:
    with Config.RAINFALL_FILE.open(newline="", encoding="utf-8") as handle:
        records = list(csv.DictReader(handle))

    values = [
        (date.fromisoformat(rec["date"]), float(rec["rainfall_mm"]), SOURCE)
        for rec in records
    ]

    with cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO rainfall_daily (date, rainfall_mm, source)
            VALUES %s
            ON CONFLICT (date) DO UPDATE
               SET rainfall_mm = EXCLUDED.rainfall_mm,
                   source      = EXCLUDED.source
            """,
            values,
            page_size=500,
        )
    return len(values)


if __name__ == "__main__":
    print(f"rainfall_daily: {load()} row(s) upserted")
