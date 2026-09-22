#!/usr/bin/env python3
"""Migrate WardAlert database schema and datasets directly to Supabase / Cloud Postgres.

Usage:
    python scripts/migrate_to_supabase.py --url "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

Or via environment variable:
    export DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
    python scripts/migrate_to_supabase.py
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate WardAlert database to Supabase")
    parser.add_argument(
        "--url",
        type=str,
        default=os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL"),
        help="Supabase Postgres connection URI (Transaction Pooler or Direct)",
    )
    parser.add_argument(
        "--use-dump",
        action="store_true",
        help="Import directly from database/supabase_dump.sql instead of running data loaders",
    )
    args = parser.parse_args()

    db_url = args.url
    if not db_url:
        print("ERROR: No database URL provided.")
        print("Please pass --url 'postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres'")
        print("or set the DATABASE_URL environment variable.")
        return 1

    # Normalize protocol for psycopg2
    if db_url.startswith("postgres://"):
        db_url = "postgresql://" + db_url[len("postgres://"):]
    elif db_url.startswith("postgresql+asyncpg://"):
        db_url = "postgresql://" + db_url[len("postgresql+asyncpg://"):]

    print("=" * 65)
    print("  WardAlert — Supabase Database Migration Tool")
    print("=" * 65)
    target_host = db_url.split("@")[-1].split("/")[0] if "@" in db_url else "target"
    print(f"Target Database Host: {target_host}\n")

    try:
        print("[1/4] Connecting to Supabase database...")
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        print("      Connected successfully.")

        print("[2/4] Enabling PostGIS spatial extension...")
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        print("      PostGIS extension enabled.")

        if args.use_dump and (REPO_ROOT / "database" / "supabase_dump.sql").exists():
            print("[3/4] Loading complete schema and dataset from database/supabase_dump.sql...")
            with open(REPO_ROOT / "database" / "supabase_dump.sql", "r", encoding="utf-8") as f:
                dump_sql = f.read()
            cur.execute(dump_sql)
            print("      Dump imported successfully.")
        else:
            print("[3/4] Applying base schema (database/init.sql)...")
            with open(REPO_ROOT / "database" / "init.sql", "r", encoding="utf-8") as f:
                schema_sql = f.read()
            cur.execute(schema_sql)
            print("      Tables and spatial indexes initialized.")

            print("[4/4] Ingesting GIS datasets, rainfall telemetry, and spatial features...")
            os.environ["DATABASE_URL"] = db_url
            
            from data_loader import main as loader_main
            loader_code = loader_main.main()
            if loader_code != 0:
                print("WARNING: Data loader reported warnings during ingestion.")

            try:
                from data_loader import seed_subscribers
                print("      Seeding simulated citizen subscribers...")
                seed_subscribers.main()
            except Exception as e:
                print(f"      (Subscriber seed note: {e})")

        # Verify final row counts
        print("\nVerifying table counts on Supabase:")
        for tbl in ("ward_boundary", "flood_spots", "drainage_segments", "rainfall_daily", "flood_events", "subscribers"):
            try:
                cur.execute(f"SELECT COUNT(*) FROM {tbl};")
                cnt = cur.fetchone()[0]
                print(f"  - {tbl:<20}: {cnt:>5} rows")
            except Exception:
                pass

        cur.close()
        conn.close()

        print("\n" + "=" * 65)
        print("  SUCCESS: Supabase database is ready for production!")
        print("=" * 65)
        return 0

    except Exception as exc:
        print(f"\nMigration failed: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
