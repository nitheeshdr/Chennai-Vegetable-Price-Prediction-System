"""
Supabase client + async SQLAlchemy engine for Alembic migrations.
"""
from __future__ import annotations

import os

from supabase import Client, create_client
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

_supabase_client: Client | None = None


def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_ANON_KEY"]
        _supabase_client = create_client(url, key)
    return _supabase_client


# SQLAlchemy (used by Alembic for migrations; Supabase client used for queries)
_engine = None


def get_engine():
    global _engine
    if _engine is None:
        db_url = os.environ.get("DATABASE_URL", "")
        if db_url:
            _engine = create_async_engine(db_url, echo=False, pool_size=5)
    return _engine


class Base(DeclarativeBase):
    pass


async def get_db_session() -> AsyncSession:
    engine = get_engine()
    if engine is None:
        raise RuntimeError("DATABASE_URL not configured")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
