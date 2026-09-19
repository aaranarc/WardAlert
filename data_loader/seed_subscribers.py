"""Seed 5 fake WhatsApp subscribers per flood spot for the demo.

Expiry is spread from 2 days ago to 6 days ahead, so some seeded subscribers
have already lapsed and the Alerts page's "Broadcast to N subscribers" count
visibly excludes them.  Re-running refreshes the same rows relative to now.

    python -m data_loader.seed_subscribers
"""
from __future__ import annotations

from backend.services.subscriber_service import hash_phone, template_languages
from data_loader.db import cursor

PER_SPOT = 5
# Days until expiry; negative = already lapsed.  Zero is skipped so no row sits
# on the boundary and flips between active and lapsed mid-demo.
EXPIRY_DAYS = [-2, -1, 1, 2, 3, 4, 5, 6]


def seed() -> int:
    languages = template_languages()
    rows = 0
    with cursor() as cur:
        cur.execute("SELECT id FROM flood_spots ORDER BY id")
        spot_ids = [row[0] for row in cur.fetchall()]
        for spot_id in spot_ids:
            for i in range(PER_SPOT):
                # A fake number only ever exists here, hashed like a real one.
                phone_hash = hash_phone(f"whatsapp:+9199990{spot_id:03d}{i}")
                cur.execute(
                    """
                    INSERT INTO subscribers (phone_hash, spot_id, language, expires_at)
                    VALUES (%s, %s, %s, NOW() + %s * INTERVAL '1 day')
                    ON CONFLICT (phone_hash) DO UPDATE
                       SET spot_id    = EXCLUDED.spot_id,
                           language   = EXCLUDED.language,
                           expires_at = EXCLUDED.expires_at
                    """,
                    (
                        phone_hash,
                        spot_id,
                        languages[(spot_id + i) % len(languages)],
                        EXPIRY_DAYS[(spot_id * 3 + i * 2) % len(EXPIRY_DAYS)],
                    ),
                )
                rows += 1
    return rows


if __name__ == "__main__":
    print(f"subscribers: {seed()} row(s) seeded")
