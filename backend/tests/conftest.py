"""Test setup.

Tests run against a SEPARATE database (TEST_DATABASE_URL) so they can never
touch development data. The database is migrated with Alembic (down to empty,
then up to head) once per run, and every table is emptied before each test.
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from dotenv import dotenv_values
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]
_env_file = dotenv_values(BACKEND_DIR / ".env")
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or _env_file.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise RuntimeError("Set TEST_DATABASE_URL (see backend/.env.example) before running tests.")
if not (make_url(TEST_DATABASE_URL).database or "").endswith("_test"):
    raise RuntimeError("Refusing to run: the test database name must end with '_test'.")

# Must happen before the app is imported, because settings are read at import time.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["ENVIRONMENT"] = "test"
os.environ["AI_PROVIDER"] = ""
os.environ["SMTP_HOST"] = ""
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-that-is-long-enough-for-hs256")

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.legal import CURRENT_TERMS_VERSION  # noqa: E402
from app.core.rate_limit import limiter  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402

TABLES = [
    "knowledge_item_tags",
    "tags",
    "knowledge_items",
    "decisions",
    "projects",
    "password_reset_tokens",
    "user_sessions",
    "users",
]
PASSWORD = "correct horse battery"


@pytest.fixture(scope="session", autouse=True)
def migrated_database() -> Iterator[None]:
    os.environ["ALEMBIC_DATABASE_URL"] = TEST_DATABASE_URL
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    yield


@pytest.fixture(autouse=True)
def clean_state() -> Iterator[None]:
    with Session(engine) as session:
        session.exec(text(f"TRUNCATE {', '.join(TABLES)} CASCADE"))  # type: ignore[call-overload]
        session.commit()
    limiter.reset()
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def db() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


def new_client() -> TestClient:
    return TestClient(app)


def registration(email: str, name: str = "Ada Lovelace", **overrides) -> dict:
    """A valid sign-up payload (including Terms acceptance)."""
    payload = {
        "email": email,
        "password": PASSWORD,
        "full_name": name,
        "accept_terms": True,
        "terms_version": CURRENT_TERMS_VERSION,
    }
    payload.update(overrides)
    return payload


def sign_up(client: TestClient, email: str = "ada@example.com", name: str = "Ada Lovelace") -> dict:
    """Register, then attach the CSRF header like the real frontend does."""
    response = client.post("/api/v1/auth/register", json=registration(email, name))
    assert response.status_code == 201, response.text
    client.headers["X-CSRF-Token"] = client.cookies["ev_csrf"]
    return response.json()


@pytest.fixture
def client() -> TestClient:
    return new_client()


@pytest.fixture
def user_client() -> TestClient:
    c = new_client()
    sign_up(c)
    return c


@pytest.fixture
def other_client() -> TestClient:
    c = new_client()
    sign_up(c, email="grace@example.com", name="Grace Hopper")
    return c
