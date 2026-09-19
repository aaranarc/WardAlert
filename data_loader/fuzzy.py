"""Fuzzy resolution of free-text spot names to canonical flood_spots rows.

Event names come from BMC bulletins and news archives ("Hindmata", "Gandhi
Market jn.") and rarely match the canonical spot name exactly.  difflib's
SequenceMatcher ratio is compared against Config.FUZZY_MATCH_THRESHOLD; the
same primitive is used by the loader and by ml.label_matching so the two can
never disagree about what matched.
"""
from __future__ import annotations

from difflib import SequenceMatcher

from config import Config
from data_loader.db import cursor


def load_spot_names() -> list[tuple[int, str]]:
    """All (spot_id, name) pairs, ordered by id."""
    with cursor() as cur:
        cur.execute("SELECT id, name FROM flood_spots ORDER BY id")
        return [(row[0], row[1]) for row in cur.fetchall()]


def _normalise(value: str) -> str:
    """Lowercase, strip punctuation, and expand the abbreviations BMC uses."""
    text = value.lower().strip()
    for old, new in (
        ("junction", "jn"),
        ("jn.", "jn"),
        ("road", "rd"),
        ("rd.", "rd"),
        ("market", "mkt"),
        ("&", "and"),
    ):
        text = text.replace(old, new)
    return " ".join(ch for ch in text.replace(",", " ").replace(".", " ").split())


def score(a: str, b: str) -> float:
    """Similarity in [0, 1]. Takes the better of whole-string and token overlap.

    Token overlap rescues cases like "Hindmata" vs "Hindmata Junction", where
    the raw ratio is dragged down by the extra word.
    """
    left, right = _normalise(a), _normalise(b)
    whole = SequenceMatcher(None, left, right).ratio()

    left_tokens, right_tokens = set(left.split()), set(right.split())
    if left_tokens and right_tokens:
        overlap = len(left_tokens & right_tokens) / min(len(left_tokens), len(right_tokens))
    else:
        overlap = 0.0
    return max(whole, overlap)


def best_match(
    name: str,
    spots: list[tuple[int, str]],
    threshold: float | None = None,
) -> tuple[int | None, float]:
    """Best (spot_id, score) for `name`, or (None, score) if below threshold."""
    threshold = Config.FUZZY_MATCH_THRESHOLD if threshold is None else threshold
    if not spots:
        return None, 0.0
    best_id, best_score = None, 0.0
    for spot_id, spot_name in spots:
        candidate = score(name, spot_name)
        if candidate > best_score:
            best_id, best_score = spot_id, candidate
    return (best_id, best_score) if best_score >= threshold else (None, best_score)
