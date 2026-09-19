"""Shared psycopg2 plumbing for the loaders."""
from __future__ import annotations

import contextlib
import time

import psycopg2

from config import Config


def connect():
    """Open a psycopg2 connection using the configured DSN."""
    return psycopg2.connect(Config.sync_dsn())


def wait_for_db(timeout: int | None = None) -> None:
    """Block until the database accepts connections, or raise after timeout.

    Equivalent to pg_isready, but without requiring the client binaries: we
    simply try to connect until one succeeds.
    """
    timeout = Config.DB_CONNECT_TIMEOUT if timeout is None else timeout
    deadline = time.time() + timeout
    last_error: Exception | None = None
    attempt = 0
    while time.time() < deadline:
        attempt += 1
        try:
            with connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    cur.fetchone()
            print(f"  database ready at {Config.POSTGRES_HOST}:{Config.POSTGRES_PORT}")
            return
        except psycopg2.OperationalError as exc:
            last_error = exc
            if attempt == 1:
                print(
                    f"  waiting for {Config.POSTGRES_HOST}:{Config.POSTGRES_PORT} "
                    f"(up to {timeout}s) ..."
                )
            time.sleep(1.0)
    raise RuntimeError(
        f"database not reachable within {timeout}s at "
        f"{Config.POSTGRES_HOST}:{Config.POSTGRES_PORT}: {last_error}"
    )


@contextlib.contextmanager
def cursor():
    """Transactional cursor — commits on success, rolls back on exception."""
    conn = connect()
    try:
        with conn:
            with conn.cursor() as cur:
                yield cur
    finally:
        conn.close()


def count(table: str) -> int:
    with cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return cur.fetchone()[0]
