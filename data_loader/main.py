"""Run every loader in dependency order. Idempotent — re-run at will.

    python -m data_loader.main
"""
from __future__ import annotations

import sys

from data_loader import (
    compute_spatial_features,
    load_drainage,
    load_flood_events,
    load_flood_spots,
    load_rainfall,
    load_ward_boundary,
)
from data_loader.db import count, wait_for_db

# (table, expected row count) — expectations come from the committed data files.
EXPECTED = [
    ("ward_boundary", 1),
    ("flood_spots", 30),
    ("drainage_segments", 54),
    ("rainfall_daily", 1096),
    ("flood_events", 32),
]


def main() -> int:
    print("WardAlert data loader")
    wait_for_db()

    # Order matters: spots and drains must exist before events (fuzzy match
    # against spot names) and before the spatial features that join them.
    print("\nloading ...")
    print(f"  ward_boundary      {load_ward_boundary.load():>5}")
    print(f"  flood_spots        {load_flood_spots.load():>5}")
    print(f"  drainage_segments  {load_drainage.load():>5}")
    print(f"  rainfall_daily     {load_rainfall.load():>5}")

    events, unmatched = load_flood_events.load()
    print(f"  flood_events       {events:>5}")
    if unmatched:
        print(f"\n  {len(unmatched)} event(s) could not be matched to a spot:")
        for name, score in unmatched:
            print(f"    - {name!r} (best score {score:.3f})")

    print("\ncomputing spatial features ...")
    spatial = compute_spatial_features.run()
    print(f"  nearest_drain_m    {spatial['nearest_drain_m']:>5}")
    print(f"  depression_depth_m {spatial['depression_depth_m']:>5}")

    print("\nrow counts")
    ok = True
    for table, expected in EXPECTED:
        actual = count(table)
        flag = "OK " if actual == expected else "BAD"
        if actual != expected:
            ok = False
        print(f"  [{flag}] {table:<20} {actual:>5}  (expected {expected})")

    matched = count("flood_events WHERE spot_id IS NOT NULL")
    print(f"  [{'OK ' if matched == 32 else 'BAD'}] events matched to spot  {matched:>5}  (expected 32)")
    if matched != 32:
        ok = False

    print("\n" + ("all loaders verified" if ok else "VERIFICATION FAILED — see BAD rows above"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
