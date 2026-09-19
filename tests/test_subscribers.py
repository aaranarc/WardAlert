"""Self-check for the WhatsApp subscription flow.

Runs against the live database through the real FastAPI app and cleans up the
rows it creates.

    python tests/test_subscribers.py
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from backend.main import app  # noqa: E402
from backend.services.subscriber_service import hash_phone  # noqa: E402
from data_loader.db import cursor  # noqa: E402

PHONE = "whatsapp:+10000000001"
EXPIRED_PHONE = "whatsapp:+10000000002"
WEBHOOK = "/api/whatsapp/webhook"


def fetch_one(sql: str, params: tuple):
    with cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def expiry(phone: str) -> datetime:
    return fetch_one("SELECT expires_at FROM subscribers WHERE phone_hash = %s", (hash_phone(phone),))[0]


def is_about_7_days_ahead(moment: datetime) -> bool:
    return abs(moment - datetime.now(timezone.utc) - timedelta(days=7)) < timedelta(minutes=1)


def cleanup(first_alert_id: int) -> None:
    hashes = (hash_phone(PHONE), hash_phone(EXPIRED_PHONE))
    with cursor() as cur:
        cur.execute("DELETE FROM subscribers WHERE phone_hash IN %s", (hashes,))
        cur.execute("DELETE FROM alerts_sent WHERE id >= %s", (first_alert_id,))


def main() -> None:
    first_alert_id = fetch_one("SELECT COALESCE(MAX(id), 0) + 1 FROM alerts_sent", ())[0]
    spot_id, lat, lng = fetch_one("SELECT id, lat, lng FROM flood_spots ORDER BY id LIMIT 1", ())

    try:
        with TestClient(app) as client:
            # Location share → subscribed to the nearest spot for ~7 days, raw phone never stored.
            res = client.post(WEBHOOK, data={"From": PHONE, "Latitude": lat, "Longitude": lng})
            assert res.status_code == 200, res.text
            assert "<Response><Message>" in res.text, res.text
            row = fetch_one(
                "SELECT spot_id FROM subscribers WHERE phone_hash = %s", (hash_phone(PHONE),)
            )
            assert row is not None, "location share did not create a subscriber"
            assert row[0] == spot_id, f"subscribed to spot {row[0]}, expected {spot_id}"
            assert is_about_7_days_ahead(expiry(PHONE)), expiry(PHONE)
            raw = fetch_one("SELECT COUNT(*) FROM subscribers WHERE phone_hash = %s", (PHONE,))[0]
            assert raw == 0, "raw phone number was stored"
            print("ok  location share subscribes for 7 days")

            # EXTEND → a nearly lapsed subscription is pushed back out to ~7 days.
            with cursor() as cur:
                cur.execute(
                    "UPDATE subscribers SET expires_at = NOW() + INTERVAL '1 hour' "
                    "WHERE phone_hash = %s",
                    (hash_phone(PHONE),),
                )
            res = client.post(WEBHOOK, data={"From": PHONE, "Body": "extend"})
            assert res.status_code == 200 and "Extended 7 days" in res.text, res.text
            assert is_about_7_days_ahead(expiry(PHONE)), expiry(PHONE)
            print("ok  EXTEND renews to 7 days")

            # Expired subscriber → excluded from the count and the broadcast.
            before = client.get(f"/api/spots/{spot_id}/subscriber-count").json()["count"]
            with cursor() as cur:
                cur.execute(
                    "INSERT INTO subscribers (phone_hash, spot_id, expires_at) "
                    "VALUES (%s, %s, NOW() - INTERVAL '1 day')",
                    (hash_phone(EXPIRED_PHONE), spot_id),
                )
            after = client.get(f"/api/spots/{spot_id}/subscriber-count").json()["count"]
            assert after == before, f"expired subscriber counted: {before} -> {after}"
            res = client.post(f"/api/alert/broadcast/{spot_id}")
            assert res.status_code == 200, res.text
            assert res.json()["broadcast_count"] == before, (res.json(), before)
            logged = fetch_one(
                "SELECT COUNT(*) FROM alerts_sent WHERE id >= %s AND recipient = %s",
                (first_alert_id, hash_phone(EXPIRED_PHONE)),
            )[0]
            assert logged == 0, "expired subscriber was alerted"
            print(f"ok  broadcast reached {before} active subscriber(s), skipped the expired one")
    finally:
        cleanup(first_alert_id)

    print("all subscriber checks passed")


if __name__ == "__main__":
    main()
