"""Async engine and session factory.

The loaders and training scripts use psycopg2 (simple, synchronous, one-shot);
the API uses asyncpg so a slow query cannot block the event loop.
"""
from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import Config

_dsn = Config.async_dsn()
_connect_args = {}
if not any(h in _dsn for h in ("localhost", "127.0.0.1", "wardalert-db")):
    _connect_args["ssl"] = "require"

engine = create_async_engine(
    _dsn,
    echo=False,
    pool_pre_ping=True,  # survive the database restarting under a long-lived API
    connect_args=_connect_args,
)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
