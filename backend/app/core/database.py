from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

is_sqlite = "sqlite" in settings.DATABASE_URL
engine_kwargs = {"echo": False}
if not is_sqlite:
    engine_kwargs.update({
        "pool_size": 15,
        "max_overflow": 25,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    })

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
