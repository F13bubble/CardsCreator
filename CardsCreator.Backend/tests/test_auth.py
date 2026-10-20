import os
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("JWT_SECRET", "test-secret-with-more-than-32-bytes-123")
os.environ["DATABASE_URL"] = "sqlite:///./test_auth.db"

import main
import database
from database import engine
from models import Group, User


@pytest.fixture(autouse=True)
def reset_db():
    db_file = Path(__file__).resolve().parents[1] / "test_auth.db"
    if db_file.exists():
        db_file.unlink()

    database.engine.dispose()
    database.engine = database.create_engine(database.DATABASE_URL, connect_args=database.connect_args)
    database.SessionLocal = database.sessionmaker(autocommit=False, autoflush=False, bind=database.engine)

    main.init_db()
    yield
    User.metadata.drop_all(bind=engine)
    if db_file.exists():
        db_file.unlink()


client = TestClient(main.app)


def test_register_login_and_me():
    register_response = client.post(
        "/auth/register",
        json={
            "email": "user@example.com",
            "username": "user",
            "password": "StrongPass123!",
        },
    )

    assert register_response.status_code == 201
    body = register_response.json()
    assert body["user"]["email"] == "user@example.com"
    assert body["user"]["username"] == "user"

    login_response = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "StrongPass123!"},
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    assert token

    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert me_response.status_code == 200
    assert me_response.json()["email"] == "user@example.com"


def test_get_groups_returns_user_groups_after_login():
    register_response = client.post(
        "/auth/register",
        json={
            "email": "groups@example.com",
            "username": "groupsuser",
            "password": "StrongPass123!",
        },
    )

    assert register_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={"email": "groups@example.com", "password": "StrongPass123!"},
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    db = database.SessionLocal()
    try:
        user = db.query(User).filter(User.email == "groups@example.com").first()
        assert user is not None

        group = Group(name="Friends", description="A test group", created_by=user.id)
        db.add(group)
        db.commit()
        db.refresh(group)

        user.groups.append(group)
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/groups",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "Friends"
    assert body[0]["description"] == "A test group"


def test_init_db_adds_missing_columns_for_existing_sqlite_tables():
    tmp_dir = tempfile.mkdtemp(prefix="cardscreator-test-", dir=str(Path(__file__).resolve().parents[1]))
    temp_db_path = Path(tmp_dir) / "migration_test.db"
    temp_db_url = f"sqlite:///{temp_db_path}"

    os.environ["DATABASE_URL"] = temp_db_url
    database.engine.dispose()
    database.engine = database.create_engine(temp_db_url, connect_args=database.connect_args)
    database.SessionLocal = database.sessionmaker(autocommit=False, autoflush=False, bind=database.engine)

    with database.engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE users (
                    id INTEGER NOT NULL PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    username VARCHAR(100) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    is_active BOOLEAN NOT NULL,
                    created_at DATETIME,
                    updated_at DATETIME
                )
                """
            )
        )

    main.init_db()

    register_response = client.post(
        "/auth/register",
        json={
            "email": "migration@example.com",
            "username": "migration-user",
            "password": "StrongPass123!",
        },
    )

    assert register_response.status_code == 201
