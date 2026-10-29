from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = os.path.dirname(__file__)
DEFAULT_SQLITE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'notion.db')}"


def _normalize_url(url: str) -> str:
    """
    Make a plain Postgres URL use the psycopg2 driver explicitly.

    Hosts give URLs like postgres://... or postgresql://... SQLAlchemy 2.0 rejects the
    first form, and SQLAlchemy 2.1+ picks the newer psycopg (v3) driver for the second,
    which is not what requirements.txt installs (psycopg2-binary).
    """
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg2://" + url[len(prefix):]
    return url


_explicit_url = os.getenv("DATABASE_URL", "").strip()
REQUESTED_DATABASE_URL = _normalize_url(_explicit_url) if _explicit_url else DEFAULT_SQLITE_URL


def _build_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    # pool_pre_ping drops dead connections (hosted Postgres closes idle ones)
    return create_engine(url, pool_pre_ping=True, pool_recycle=300)


def _resolve_engine():
    """
    Connect to the database or stop.

    If DATABASE_URL is set, a failure is fatal on purpose: silently falling back
    to a local SQLite file on a host with an ephemeral disk would lose all data
    without any error. Local SQLite is only used when DATABASE_URL is not set.
    """
    try:
        engine = _build_engine(REQUESTED_DATABASE_URL)
        with engine.connect():
            return engine, REQUESTED_DATABASE_URL
    except (SQLAlchemyError, ModuleNotFoundError) as exc:
        if _explicit_url:
            raise RuntimeError(
                "Could not connect to the database configured in DATABASE_URL "
                f"({type(exc).__name__}: {exc}). Check the URL and that psycopg2-binary is installed."
            ) from exc
        raise


engine, SQLALCHEMY_DATABASE_URL = _resolve_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()