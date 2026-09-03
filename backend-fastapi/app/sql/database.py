from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.sql.models import Base

engine = None
async_session: async_sessionmaker[AsyncSession] | None = None


def sql_enabled() -> bool:
    return bool(settings.postgres_uri)


def get_session_factory() -> async_sessionmaker[AsyncSession] | None:
    """Always reads the current module-level value, unlike
    `from app.sql.database import async_session`, which would capture
    None at import time (before init_sql_db runs) and never update."""
    return async_session


def _build_async_url_and_connect_args(raw_uri: str):
    """Normalize a plain `postgresql://...` URI (e.g. from Neon) into the
    asyncpg-driver form SQLAlchemy's async engine needs, and translate the
    libpq-style `sslmode` query param into asyncpg's `ssl` connect arg."""

    url = make_url(raw_uri)

    if url.drivername in ("postgresql", "postgres"):
        url = url.set(drivername="postgresql+asyncpg")

    connect_args = {}
    query = dict(url.query)

    if "sslmode" in query:
        query.pop("sslmode")
        connect_args["ssl"] = "require"

    # libpq-specific params asyncpg doesn't understand as query args
    query.pop("channel_binding", None)

    url = url.set(query=query)

    return url, connect_args


async def init_sql_db() -> None:
    global engine, async_session

    if not sql_enabled():
        return

    url, connect_args = _build_async_url_and_connect_args(settings.postgres_uri)

    engine = create_async_engine(url, echo=False, connect_args=connect_args)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
