"""Citizen WhatsApp subscriptions.

A citizen is identified only by sha256 of Twilio's "From" value — the raw
number is never written anywhere.  Each phone follows one spot at a time, and a
subscription lapses 7 days after it was last created or extended, so the list
never accumulates people who stopped caring once the rain passed.
"""
from __future__ import annotations

import hashlib

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import Config


def hash_phone(sender: str) -> str:
    return hashlib.sha256(sender.encode("utf-8")).hexdigest()


def template_languages() -> list[str]:
    """Languages with an alert template on disk — the only ones we can reply in."""
    return sorted(
        path.stem.removeprefix("alert_") for path in Config.TEMPLATE_DIR.glob("alert_*.txt")
    )


async def nearest_spot(session: AsyncSession, lat: float, lng: float) -> dict:
    result = await session.execute(
        text(
            """
            SELECT id, name
              FROM flood_spots
             ORDER BY ST_Distance(
                        geom::geography,
                        ST_SetSRID(ST_MakePoint(:lng, :lat), :srid)::geography
                      )
             LIMIT 1
            """
        ),
        {"lat": lat, "lng": lng, "srid": Config.SRID},
    )
    return dict(result.mappings().one())


async def subscribe(
    session: AsyncSession, phone_hash: str, spot_id: int, language: str | None
) -> str:
    """Create or move a subscription and restart its 7 days; returns its language."""
    result = await session.execute(
        text(
            """
            INSERT INTO subscribers (phone_hash, spot_id, language, expires_at)
            VALUES (:phone_hash, :spot_id, COALESCE(:language, :default_language),
                    NOW() + INTERVAL '7 days')
            ON CONFLICT (phone_hash) DO UPDATE
               SET spot_id    = EXCLUDED.spot_id,
                   expires_at = EXCLUDED.expires_at,
                   language   = COALESCE(:language, subscribers.language)
            RETURNING language
            """
        ),
        {
            "phone_hash": phone_hash,
            "spot_id": spot_id,
            "language": language,
            "default_language": Config.DEFAULT_LANGUAGE,
        },
    )
    subscribed_language = result.scalar_one()
    await session.commit()
    return subscribed_language


async def extend(session: AsyncSession, phone_hash: str) -> str | None:
    """Push expiry to 7 days from now; returns the spot name, or None if unknown.

    Lapsed subscriptions are renewable too — the row is kept after expiry so a
    citizen can come back with EXTEND instead of re-sharing their location.
    """
    result = await session.execute(
        text(
            """
            UPDATE subscribers sub
               SET expires_at = NOW() + INTERVAL '7 days'
              FROM flood_spots s
             WHERE sub.phone_hash = :phone_hash
               AND s.id = sub.spot_id
            RETURNING s.name
            """
        ),
        {"phone_hash": phone_hash},
    )
    spot_name = result.scalar_one_or_none()
    await session.commit()
    return spot_name


async def active(session: AsyncSession, phone_hash: str) -> dict | None:
    result = await session.execute(
        text(
            """
            SELECT id, phone_hash, spot_id, language, created_at, expires_at
              FROM subscribers
             WHERE phone_hash = :phone_hash AND expires_at > NOW()
            """
        ),
        {"phone_hash": phone_hash},
    )
    row = result.mappings().first()
    return dict(row) if row else None


async def set_language(session: AsyncSession, phone_hash: str, language: str) -> bool:
    result = await session.execute(
        text("UPDATE subscribers SET language = :language WHERE phone_hash = :phone_hash"),
        {"phone_hash": phone_hash, "language": language},
    )
    await session.commit()
    return result.rowcount > 0


async def unsubscribe(session: AsyncSession, phone_hash: str) -> bool:
    result = await session.execute(
        text("DELETE FROM subscribers WHERE phone_hash = :phone_hash"),
        {"phone_hash": phone_hash},
    )
    await session.commit()
    return result.rowcount > 0
