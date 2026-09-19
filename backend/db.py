"""Async engine and session factory.

The loaders and training scripts use psycopg2 (simple, synchronous, one-shot);
the API uses asyncpg so a slow query cannot block the event loop.
"""
from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import Config

engine = create_async_engine(
    Config.async_dsn(),
    echo=False,
    pool_pre_ping=True,  # survive the database restarting under a long-lived API
)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
