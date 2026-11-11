from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Aurora Serverless v2 takes ~15 s to resume from auto-pause; pymysql's default
# 10 s connect timeout would fail the first request (and `alembic upgrade`).
MYSQL_CONNECT_TIMEOUT_SECONDS = 20


def connect_args_for(url: str) -> dict:
    """DBAPI connect args for `url` (SQLite, used in tests, takes none)."""
    if url.startswith("mysql"):
        return {"connect_timeout": MYSQL_CONNECT_TIMEOUT_SECONDS}
    return {}


engine = create_engine(
    settings.sqlalchemy_url,
    poolclass=NullPool,
    connect_args=connect_args_for(settings.sqlalchemy_url),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency - yields a DB session per-request, closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
