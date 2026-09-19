"""Load the 32 observed flood events and attach each to a flood spot.

Event spot names come from BMC bulletins and news archives, so they do not
match the canonical flood_spots names character for character.  We resolve
them with difflib.SequenceMatcher at Config.FUZZY_MATCH_THRESHOLD and report
anything left unmatched — an unmatched event is kept in the table with a NULL
spot_id rather than dropped, so it stays visible for manual review.
"""
from __future__ import annotations

import csv
from datetime import datetime, time, timedelta, timezone

from config import Config
from data_loader.db import cursor
from data_loader.fuzzy import best_match, load_spot_names

# Event timestamps are local Mumbai wall-clock (IST, UTC+05:30).
IST = timezone(timedelta(hours=5, minutes=30))


def _parse_ts(day: str, clock: str | None) -> datetime:
    parsed_day = datetime.strptime(day, "%Y-%m-%d").date()
    if clock and clock.strip():
        parts = [int(p) for p in clock.strip().split(":")]
        parsed_time = time(parts[0], parts[1] if len(parts) > 1 else 0)
    else:
        parsed_time = time(0, 0)
    return datetime.combine(parsed_day, parsed_time, tzinfo=IST)


def load() -> tuple[int, list[tuple[str, float]]]:
    """Returns (rows upserted, list of (spot_name, best_score) left unmatched)."""
    with Config.FLOOD_EVENTS_FILE.open(newline="", encoding="utf-8") as handle:
        records = list(csv.DictReader(handle))

    spot_names = load_spot_names()
    unmatched: list[tuple[str, float]] = []
    rows = 0

    with cursor() as cur:
        for rec in records:
            raw_name = rec["spot_name"].strip()
            spot_id, score = best_match(raw_name, spot_names)
            if spot_id is None:
                unmatched.append((raw_name, score))

            cur.execute(
                """
                INSERT INTO flood_events
                       (event_ts, spot_name, spot_id, match_score, severity, source)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (event_ts, spot_name) DO UPDATE
                   SET spot_id     = EXCLUDED.spot_id,
                       match_score = EXCLUDED.match_score,
                       severity    = EXCLUDED.severity,
                       source      = EXCLUDED.source
                """,
                (
                    _parse_ts(rec["event_date"], rec.get("event_time")),
                    raw_name,
                    spot_id,
                    round(score, 4),
                    rec.get("severity"),
                    rec.get("source"),
                ),
            )
            rows += 1
    return rows, unmatched


if __name__ == "__main__":
    total, missing = load()
    print(f"flood_events: {total} row(s) upserted")
    for name, score in missing:
        print(f"  UNMATCHED: {name!r} (best score {score:.3f})")
