import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (AsyncEngine, AsyncSession,
                                    async_sessionmaker, create_async_engine)

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://adsb:adsb@localhost:5432/adsb",
)
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
)
session_factory = async_sessionmaker(engine, expire_on_commit=False)


def get_session() -> AsyncSession:
    """Create an async SQLAlchemy session."""
    return session_factory()