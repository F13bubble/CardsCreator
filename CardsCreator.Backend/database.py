import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DEFAULT_DB_PATH = str((Path(__file__).resolve().parent / "cardscreator.db").resolve())
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DEFAULT_DB_PATH}"
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _ensure_sqlite_file_is_writable() -> None:
    if DATABASE_URL.startswith("sqlite"):
        if DATABASE_URL.startswith("sqlite:///"):
            db_path = DATABASE_URL.removeprefix("sqlite:///")
        else:
            db_path = DATABASE_URL.removeprefix("sqlite://")

        if not db_path:
            return

        resolved_path = Path(db_path).expanduser().resolve()
        resolved_path.parent.mkdir(parents=True, exist_ok=True)
        if not resolved_path.exists():
            resolved_path.touch()


def init_db() -> None:
    _ensure_sqlite_file_is_writable()
    Base.metadata.create_all(bind=engine)

    if DATABASE_URL.startswith("sqlite"):
        with engine.begin() as connection:
            inspector = connection.dialect.get_columns(connection, "users")
            existing_columns = {column["name"] for column in inspector}

            if "has_groups" not in existing_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN has_groups BOOLEAN DEFAULT 0"))


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
