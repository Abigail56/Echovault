"""Data export, email change and re-accepting updated Terms."""

from sqlmodel import select

from app.core.legal import CURRENT_TERMS_VERSION
from app.main import app
from app.models import User
from app.services.email_service import get_email_sender
from tests.conftest import PASSWORD, new_client

API = "/api/v1/auth"


def test_export_contains_only_my_data(user_client, other_client):
    project = user_client.post("/api/v1/projects", json={"name": "Thesis"}).json()
    a = user_client.post("/api/v1/knowledge", json={"title": "A", "tags": ["x"], "project_id": project["id"]}).json()
    b = user_client.post("/api/v1/knowledge", json={"title": "B", "related_ids": [a["id"]]}).json()
    user_client.patch(f"/api/v1/knowledge/{b['id']}", json={"archived": True})
    user_client.post("/api/v1/decisions", json={"title": "Use LaTeX", "decision": "LaTeX", "status": "proposed"})
    other_client.post("/api/v1/knowledge", json={"title": "Grace's secret"})

    response = user_client.get(f"{API}/export")
    assert response.status_code == 200
    assert response.headers["content-disposition"].startswith('attachment; filename="echovault-export-')
    data = response.json()
    assert data["format"] == "echovault-export"
    assert data["account"]["email"] == "ada@example.com"
    assert "password_hash" not in str(data)
    assert [p["name"] for p in data["projects"]] == ["Thesis"]
    notes = {n["title"]: n for n in data["notes"]}
    assert set(notes) == {"A", "B"}  # includes archived, excludes the other user's note
    assert notes["A"]["tags"] == ["x"] and notes["A"]["project_id"] == project["id"]
    assert notes["A"]["related_note_ids"] == [b["id"]]
    assert notes["B"]["archived_at"] is not None
    assert data["decisions"][0]["selected_option"] == "LaTeX"
    assert data["decisions"][0]["status"] == "proposed"


def test_export_requires_sign_in(client):
    assert client.get(f"{API}/export").status_code == 401


class Outbox:
    def __init__(self):
        self.sent: list[tuple[str, str]] = []

    def send(self, to: str, subject: str, body: str) -> None:
        self.sent.append((to, body))


def test_change_email(user_client, other_client, db):
    outbox = Outbox()
    app.dependency_overrides[get_email_sender] = lambda: outbox

    wrong = user_client.post(f"{API}/change-email", json={"new_email": "ada@new.example", "password": "nope-nope-nope"})
    assert wrong.status_code == 422
    taken = user_client.post(f"{API}/change-email", json={"new_email": "GRACE@example.com", "password": PASSWORD})
    assert taken.status_code == 409
    same = user_client.post(f"{API}/change-email", json={"new_email": "ada@example.com", "password": PASSWORD})
    assert same.status_code == 422
    assert user_client.post(f"{API}/change-email", json={"new_email": "bad", "password": PASSWORD}).status_code == 422

    ok = user_client.post(f"{API}/change-email", json={"new_email": " Ada@New.Example ", "password": PASSWORD})
    assert ok.status_code == 200
    assert ok.json()["email"] == "ada@new.example"
    # The old address is warned, without revealing the new one.
    assert [to for to, _ in outbox.sent] == ["ada@example.com"]
    assert "ada@new.example" not in outbox.sent[0][1]
    # Sign-in works with the new address only.
    fresh = new_client()
    assert fresh.post(f"{API}/login", json={"email": "ada@example.com", "password": PASSWORD}).status_code == 401
    assert fresh.post(f"{API}/login", json={"email": "ada@new.example", "password": PASSWORD}).status_code == 200


def test_change_email_requires_csrf(user_client):
    del user_client.headers["X-CSRF-Token"]
    response = user_client.post(f"{API}/change-email", json={"new_email": "x@new.example", "password": PASSWORD})
    assert response.status_code == 403


def test_accept_updated_terms(user_client, db):
    user = db.exec(select(User).where(User.email == "ada@example.com")).one()
    user.terms_version = "2000-01-01"
    db.add(user)
    db.commit()
    assert user_client.get(f"{API}/me").json()["terms_version"] == "2000-01-01"

    assert user_client.post(f"{API}/accept-terms", json={"terms_version": "1999-01-01"}).status_code == 422
    ok = user_client.post(f"{API}/accept-terms", json={"terms_version": CURRENT_TERMS_VERSION})
    assert ok.status_code == 200
    assert ok.json()["terms_version"] == CURRENT_TERMS_VERSION
    assert ok.json()["terms_accepted_at"] is not None
