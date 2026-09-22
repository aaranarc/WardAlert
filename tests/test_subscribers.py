"""Self-check and regression test suite for WhatsApp Alert & Citizen Dispatch System.

Runs against the live database through FastAPI TestClient and cleans up test rows.

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
JSON_PHONE = "whatsapp:+10000000003"
WEBHOOK = "/api/whatsapp/webhook"


def fetch_one(sql: str, params: tuple):
    with cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def expiry(phone: str) -> datetime:
    return fetch_one(
        "SELECT expires_at FROM subscribers WHERE phone_hash = %s",
        (hash_phone(phone),),
    )[0]


def is_about_7_days_ahead(moment: datetime) -> bool:
    return abs(moment - datetime.now(timezone.utc) - timedelta(days=7)) < timedelta(minutes=2)


def cleanup(first_alert_id: int) -> None:
    hashes = (hash_phone(PHONE), hash_phone(EXPIRED_PHONE), hash_phone(JSON_PHONE))
    with cursor() as cur:
        cur.execute("DELETE FROM subscribers WHERE phone_hash IN %s", (hashes,))
        cur.execute("DELETE FROM alerts_sent WHERE id >= %s", (first_alert_id,))


def main() -> None:
    first_alert_id = fetch_one("SELECT COALESCE(MAX(id), 0) + 1 FROM alerts_sent", ())[0]
    spot_row = fetch_one("SELECT id, name, lat, lng FROM flood_spots ORDER BY id LIMIT 1", ())
    spot_id, spot_name, lat, lng = spot_row

    print(f"Target test spot: #{spot_id} - {spot_name} ({lat}, {lng})")

    try:
        with TestClient(app) as client:
            # ----------------------------------------------------------------
            # 1. Location share (Form TwiML) → Subscribes for 7 days
            # ----------------------------------------------------------------
            res = client.post(WEBHOOK, data={"From": PHONE, "Latitude": lat, "Longitude": lng})
            assert res.status_code == 200, f"Location share form failed: {res.text}"
            assert "<Response><Message>" in res.text, f"Expected TwiML response: {res.text}"
            row = fetch_one(
                "SELECT spot_id FROM subscribers WHERE phone_hash = %s",
                (hash_phone(PHONE),),
            )
            assert row is not None, "location share did not create a subscriber"
            assert row[0] == spot_id, f"subscribed to spot {row[0]}, expected {spot_id}"
            assert is_about_7_days_ahead(expiry(PHONE)), f"Expiry mismatch: {expiry(PHONE)}"

            raw_stored = fetch_one(
                "SELECT COUNT(*) FROM subscribers WHERE phone_hash = %s",
                (PHONE,),
            )[0]
            assert raw_stored == 0, "Privacy violation: raw phone number was stored"
            print("✓ [PASS] Location share (Form TwiML) subscribes for 7 days with SHA-256 hash")

            # ----------------------------------------------------------------
            # 2. Location share (JSON Simulator) → Returns structured JSON
            # ----------------------------------------------------------------
            res = client.post(
                WEBHOOK,
                json={"From": JSON_PHONE, "Latitude": lat, "Longitude": lng},
            )
            assert res.status_code == 200, f"Location share JSON failed: {res.text}"
            data = res.json()
            assert data.get("success") is True, data
            assert data.get("action") == "subscribed_by_location", data
            assert "reply_message" in data, data
            assert data["spot"]["id"] == spot_id, data
            print("✓ [PASS] Location share (JSON payload) returns structured simulation response")

            # ----------------------------------------------------------------
            # 3. Language preference keyword
            # ----------------------------------------------------------------
            res = client.post(
                WEBHOOK,
                json={"From": PHONE, "Body": "hindi"},
            )
            assert res.status_code == 200, res.text
            assert res.json().get("action") == "language_set", res.text
            lang_row = fetch_one(
                "SELECT language FROM subscribers WHERE phone_hash = %s",
                (hash_phone(PHONE),),
            )
            assert lang_row[0] == "hi", f"Expected language 'hi', got {lang_row[0]}"
            print("✓ [PASS] Language switching keyword ('hindi') updates preferred language to 'hi'")

            # ----------------------------------------------------------------
            # 4. STATUS query
            # ----------------------------------------------------------------
            res = client.post(
                WEBHOOK,
                json={"From": PHONE, "Body": "STATUS"},
            )
            assert res.status_code == 200, res.text
            assert res.json().get("action") == "status_reply", res.text
            assert res.json()["spot"]["id"] == spot_id, res.text
            print("✓ [PASS] STATUS keyword returns current dual-model risk for subscriber's spot")

            # ----------------------------------------------------------------
            # 5. EXTEND renewal → pushes back to 7 days
            # ----------------------------------------------------------------
            with cursor() as cur:
                cur.execute(
                    "UPDATE subscribers SET expires_at = NOW() + INTERVAL '1 hour' "
                    "WHERE phone_hash = %s",
                    (hash_phone(PHONE),),
                )
            res = client.post(WEBHOOK, json={"From": PHONE, "Body": "EXTEND"})
            assert res.status_code == 200, res.text
            assert res.json().get("action") == "extended", res.text
            assert is_about_7_days_ahead(expiry(PHONE)), expiry(PHONE)
            print("✓ [PASS] EXTEND keyword renews subscription to 7 days")

            # ----------------------------------------------------------------
            # 6. STOP keyword → unsubscribes
            # ----------------------------------------------------------------
            res = client.post(WEBHOOK, json={"From": PHONE, "Body": "STOP"})
            assert res.status_code == 200, res.text
            assert res.json().get("action") == "unsubscribed", res.text
            unsub_row = fetch_one(
                "SELECT COUNT(*) FROM subscribers WHERE phone_hash = %s",
                (hash_phone(PHONE),),
            )
            assert unsub_row[0] == 0, "STOP keyword did not delete subscriber"
            print("✓ [PASS] STOP keyword successfully unregisters citizen")

            # ----------------------------------------------------------------
            # 7. Subscriber Counts Endpoint
            # ----------------------------------------------------------------
            res = client.get(f"/api/subscribers/count/{spot_id}")
            assert res.status_code == 200, res.text
            counts = res.json()
            assert counts["spot_id"] == spot_id
            assert counts["spot_name"] == spot_name
            assert "spot_subscribers" in counts
            assert "radius_subscribers" in counts
            assert counts["critical_radius_km"] == 2.0
            print(f"✓ [PASS] GET /api/subscribers/count/{spot_id} returns: {counts}")

            # ----------------------------------------------------------------
            # 8. Municipal Broadcast (Normal Mode)
            # ----------------------------------------------------------------
            res = client.post(
                f"/api/alert/broadcast/{spot_id}",
                json={"mode": "normal", "language": "en"},
            )
            assert res.status_code == 200, res.text
            bcast = res.json()
            assert bcast["mode"] == "normal"
            assert bcast["channels"] == ["whatsapp"]
            assert "sample_payload" in bcast
            print(f"✓ [PASS] Normal broadcast succeeded: {bcast['message']}")

            # ----------------------------------------------------------------
            # 9. Municipal Broadcast (Critical Mode - Radius 2.0 km)
            # ----------------------------------------------------------------
            res = client.post(
                f"/api/alert/broadcast/{spot_id}",
                json={"mode": "critical", "language": "en"},
            )
            assert res.status_code == 200, res.text
            bcast_crit = res.json()
            assert bcast_crit["mode"] == "critical"
            assert set(bcast_crit["channels"]) == {"whatsapp", "sms"}
            assert "2.0km" in bcast_crit["message"] or "radius" in bcast_crit["message"]
            print(f"✓ [PASS] Critical broadcast succeeded: {bcast_crit['message']}")

    finally:
        cleanup(first_alert_id)

    print("\n==================================================")
    print("ALL WHATSAPP & CITIZEN DISPATCH TESTS PASSED! 🎉")
    print("==================================================")


if __name__ == "__main__":
    main()
