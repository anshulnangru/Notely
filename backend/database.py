from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = os.path.dirname(__file__)
DEFAULT_SQLITE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'notion.db')}"
REQUESTED_DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)


def _build_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args)


def _resolve_engine():
    try:
        primary_engine = _build_engine(REQUESTED_DATABASE_URL)
        with primary_engine.connect():
            return primary_engine, REQUESTED_DATABASE_URL
    except (SQLAlchemyError, ModuleNotFoundError):
        if REQUESTED_DATABASE_URL.startswith("sqlite"):
            raise

        fallback_engine = _build_engine(DEFAULT_SQLITE_URL)
        with fallback_engine.connect():
            print(
                "[database] Could not connect to configured DATABASE_URL; "
                f"falling back to local SQLite at {DEFAULT_SQLITE_URL}"
            )
        return fallback_engine, DEFAULT_SQLITE_URL


engine, SQLALCHEMY_DATABASE_URL = _resolve_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
