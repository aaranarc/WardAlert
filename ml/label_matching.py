"""Report how every flood event resolved to a flood spot, and re-run matching.

The matcher itself lives in data_loader.fuzzy so the loader and this report can
never disagree.  This module is the auditable view over it:

    python -m ml.label_matching

prints one line per event with its score, then every unmatched event with the
closest candidate that was rejected -- events are never silently dropped.
"""
from __future__ import annotations

import sys

from config import Config
from data_loader.db import cursor
from data_loader.fuzzy import best_match, load_spot_names, score


def rematch() -> None:
    """Recompute spot_id/match_score for every event using current threshold."""
    spots = load_spot_names()
    with cursor() as cur:
        cur.execute("SELECT id, spot_name FROM flood_events ORDER BY event_ts")
        events = cur.fetchall()
        for event_id, raw_name in events:
            spot_id, match_score = best_match(raw_name, spots)
            cur.execute(
                "UPDATE flood_events SET spot_id = %s, match_score = %s WHERE id = %s",
                (spot_id, round(match_score, 4), event_id),
            )


def report() -> int:
    """Print the match table. Returns the number of unmatched events."""
    spots = load_spot_names()
    with cursor() as cur:
        cur.execute(
            """
            SELECT e.event_ts, e.spot_name, e.spot_id, e.match_score, s.name
              FROM flood_events e
              LEFT JOIN flood_spots s ON s.id = e.spot_id
             ORDER BY e.event_ts
            """
        )
        rows = cur.fetchall()

    print(f"label matching  (threshold = {Config.FUZZY_MATCH_THRESHOLD})")
    print(f"{'event':<12} {'event spot_name':<32} -> {'matched flood_spot':<30} score")
    print("-" * 92)

    unmatched: list[tuple[str, str]] = []
    for event_ts, raw_name, spot_id, match_score, spot_name in rows:
        if spot_id is None:
            unmatched.append((raw_name, event_ts.date().isoformat()))
            target, mark = "** UNMATCHED **", "!"
        else:
            target, mark = spot_name, " "
        print(
            f"{event_ts.date().isoformat():<12} {raw_name:<32} -> {target:<30} "
            f"{match_score:.3f}{mark}"
        )

    print("-" * 92)
    print(f"{len(rows) - len(unmatched)}/{len(rows)} events matched")

    if unmatched:
        print("\nunmatched events — nearest rejected candidates:")
        for raw_name, when in unmatched:
            ranked = sorted(
                ((score(raw_name, name), name) for _sid, name in spots), reverse=True
            )[:3]
            print(f"  {when}  {raw_name!r}")
            for candidate_score, name in ranked:
                print(f"      {candidate_score:.3f}  {name}")
        print(
            "\nNo event was dropped: each is stored in flood_events with a NULL "
            "spot_id and can be mapped by hand or by lowering FUZZY_MATCH_THRESHOLD."
        )
    return len(unmatched)


if __name__ == "__main__":
    rematch()
    sys.exit(1 if report() else 0)
