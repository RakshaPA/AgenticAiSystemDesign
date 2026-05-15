# resume_screener/db.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///resume_screener.db"
)

# SQLite-specific engine options
engine_kwargs = {}
if "sqlite" in DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = None  # Disable pooling for SQLite

engine = create_async_engine(DATABASE_URL, echo=False, **engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Enable pgvector extension on first connect (PostgreSQL only)
async def init_pgvector():
    if "postgresql" in DATABASE_URL:
        async with engine.begin() as conn:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")