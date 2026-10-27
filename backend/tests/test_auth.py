import uuid
from datetime import UTC, datetime, timedelta

import jwt
from sqlmodel import select

from app.core.config import settings
from app.models import User, UserSession
from app.services import auth_service
from app.services.email_service import get_email_sender
from app.main import app
from tests.conftest import PASSWORD, new_client, sign_up

API = "/api/v1/auth"


def test_register_creates_user_and_session(client, db):
    body = sign_up(client, email="  Ada@Example.COM ")
    assert body["email"] == "ada@example.com"
    assert "password_hash" not in body and "password" not in body
    user = db.exec(select(User).where(User.email == "ada@example.com")).one()
    assert user.password_hash.startswith("$argon2")
    assert PASSWORD not in user.password_hash
    assert client.get(f"{API}/me").json()["email"] == "ada@example.com"
    # Session cookies are HttpOnly; the CSRF cookie is readable by JS.
    set_cookie = client.post(
        f"{API}/login", json={"email": "ada@example.com", "password": PASSWORD}
    ).headers.get_list("set-cookie")
    access = next(c for c in set_cookie if c.startswith("ev_access="))
    csrf = next(c for c in set_cookie if c.startswith("ev_csrf="))
    assert "HttpOnly" in access and "SameSite=lax" in access
    assert "HttpOnly" not in csrf


def test_register_validation(client):
    bad = [
        {"email": "not-an-email", "password": PASSWORD, "full_name": "A"},
        {"email": "a@example.com", "password": "short", "full_name": "A"},
        {"email": "a@example.com", "password": PASSWORD, "full_name": "   "},
        {"email": "a@example.com", "password": " " * 12, "full_name": "A"},
    ]
    for payload in bad:
        assert client.post(f"{API}/register", json=payload).status_code == 422


def test_duplicate_email_is_rejected_case_insensitively(client):
    sign_up(client)
    other = new_client()
    response = other.post(
        f"{API}/register", json={"email": "ADA@example.com", "password": PASSWORD, "full_name": "X"}
    )
    assert response.status_code == 409


def test_concurrent_duplicate_registration_hits_unique_constraint(db):
    # Simulate the race: bypass the pre-check and rely on the DB constraint.
    db.add(User(email="race@example.com", full_name="A", password_hash="x"))
    db.commit()
    try:
        auth_service.register_user(db, "race@example.com", PASSWORD, "B")
    except auth_service.ConflictError:
        pass
    else:
        raise AssertionError("expected ConflictError")


def test_login_success_and_generic_failure(client):
    sign_up(client)
    fresh = new_client()
    ok = fresh.post(f"{API}/login", json={"email": "ADA@example.com", "password": PASSWORD})
    assert ok.status_code == 200
    wrong_pw = fresh.post(f"{API}/login", json={"email": "ada@example.com", "password": "nope-nope-nope"})
    no_user = fresh.post(f"{API}/login", json={"email": "nobody@example.com", "password": PASSWORD})
    assert wrong_pw.status_code == no_user.status_code == 401
    assert wrong_pw.json() == no_user.json() == {"detail": "Invalid email or password"}


def test_login_is_rate_limited(client):
    sign_up(client)
    fresh = new_client()
    codes = [
        fresh.post(f"{API}/login", json={"email": "ada@example.com", "password": "wrong-password"}).status_code
        for _ in range(9)
    ]
    assert codes[:8] == [401] * 8
    assert codes[8] == 429


def test_protected_endpoints_require_auth(client):
    for path in ["/api/v1/auth/me", "/api/v1/knowledge", "/api/v1/projects", "/api/v1/decisions",
                 "/api/v1/search?q=x", "/api/v1/dashboard/stats", "/api/v1/assistant/status"]:
        assert client.get(path).status_code == 401, path


def test_invalid_and_expired_tokens_are_rejected(user_client):
    me = user_client.get(f"{API}/me").json()
    garbage = new_client()
    garbage.cookies.set("ev_access", "not-a-jwt", path="/api/v1")
    assert garbage.get(f"{API}/me").status_code == 401

    expired_token = jwt.encode(
        {
            "sub": me["id"],
            "sid": str(uuid.uuid4()),
            "type": "access",
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    expired = new_client()
    expired.cookies.set("ev_access", expired_token, path="/api/v1")
    assert expired.get(f"{API}/me").status_code == 401

    forged = jwt.encode(
        {"sub": me["id"], "sid": str(uuid.uuid4()), "type": "access",
         "exp": datetime.now(UTC) + timedelta(minutes=5)},
        "a-different-secret-that-is-long-enough-xx",
        algorithm="HS256",
    )
    attacker = new_client()
    attacker.cookies.set("ev_access", forged, path="/api/v1")
    assert attacker.get(f"{API}/me").status_code == 401


def test_logout_revokes_session_immediately(user_client):
    access = user_client.cookies["ev_access"]
    assert user_client.post(f"{API}/logout").status_code == 204
    # Even if someone kept a copy of the (still unexpired) access token:
    replay = new_client()
    replay.cookies.set("ev_access", access, path="/api/v1")
    assert replay.get(f"{API}/me").status_code == 401


def test_logout_everywhere(user_client):
    laptop = new_client()
    laptop.post(f"{API}/login", json={"email": "ada@example.com", "password": PASSWORD})
    assert user_client.post(f"{API}/logout-all").status_code == 204
    assert laptop.get(f"{API}/me").status_code == 401
    assert user_client.get(f"{API}/me").status_code == 401


def test_csrf_header_required_for_writes(user_client):
    del user_client.headers["X-CSRF-Token"]
    assert user_client.post("/api/v1/projects", json={"name": "P"}).status_code == 403
    user_client.headers["X-CSRF-Token"] = "wrong"
    assert user_client.post("/api/v1/projects", json={"name": "P"}).status_code == 403
    user_client.headers["X-CSRF-Token"] = user_client.cookies["ev_csrf"]
    assert user_client.post("/api/v1/projects", json={"name": "P"}).status_code == 201


def test_refresh_rotates_token_and_detects_reuse(user_client, db, monkeypatch):
    old_refresh = user_client.cookies["ev_refresh"]
    response = user_client.post(f"{API}/refresh")
    assert response.status_code == 200
    new_refresh = user_client.cookies["ev_refresh"]
    assert new_refresh != old_refresh
    user_client.headers["X-CSRF-Token"] = user_client.cookies["ev_csrf"]
    assert user_client.get(f"{API}/me").status_code == 200

    # Reusing the old token after the grace period is treated as theft.
    monkeypatch.setattr(auth_service, "ROTATION_GRACE", timedelta(0))
    thief = new_client()
    thief.cookies.set("ev_refresh", old_refresh, path="/api/v1/auth")
    thief.cookies.set("ev_csrf", "t", path="/")
    thief.headers["X-CSRF-Token"] = "t"
    assert thief.post(f"{API}/refresh").status_code == 401
    db.expire_all()
    assert db.exec(select(UserSession)).one().revoked_at is not None
    assert user_client.get(f"{API}/me").status_code == 401


def test_refresh_without_cookie_fails(client):
    client.cookies.set("ev_csrf", "t", path="/")
    client.headers["X-CSRF-Token"] = "t"
    assert client.post(f"{API}/refresh").status_code == 401


def test_change_password_signs_out_other_sessions(user_client):
    laptop = new_client()
    laptop.post(f"{API}/login", json={"email": "ada@example.com", "password": PASSWORD})
    assert laptop.get(f"{API}/me").status_code == 200

    bad = user_client.post(f"{API}/change-password", json={"current_password": "wrong", "new_password": "a brand new password"})
    assert bad.status_code == 422
    ok = user_client.post(
        f"{API}/change-password", json={"current_password": PASSWORD, "new_password": "a brand new password"}
    )
    assert ok.status_code == 204
    assert user_client.get(f"{API}/me").status_code == 200
    assert laptop.get(f"{API}/me").status_code == 401


def test_update_profile(user_client):
    response = user_client.patch(f"{API}/me", json={"full_name": "  Countess Ada  "})
    assert response.status_code == 200
    assert response.json()["full_name"] == "Countess Ada"


class FakeEmail:
    def __init__(self):
        self.sent: list[tuple[str, str]] = []

    def send(self, to: str, subject: str, body: str) -> None:
        self.sent.append((to, body))


def test_password_reset_not_configured(client):
    assert client.get(f"{API}/config").json() == {"password_reset_available": False}
    response = client.post(f"{API}/password-reset/request", json={"email": "ada@example.com"})
    assert response.status_code == 503


def test_password_reset_flow(user_client):
    outbox = FakeEmail()
    app.dependency_overrides[get_email_sender] = lambda: outbox
    anon = new_client()

    unknown = anon.post(f"{API}/password-reset/request", json={"email": "nobody@example.com"})
    known = anon.post(f"{API}/password-reset/request", json={"email": "ada@example.com"})
    assert unknown.status_code == known.status_code == 202
    assert unknown.json() == known.json()  # no account enumeration
    assert len(outbox.sent) == 1
    token = outbox.sent[0][1].split("token=")[1].split()[0]

    assert anon.post(f"{API}/password-reset/confirm", json={"token": "x" * 40, "new_password": "another good password"}).status_code == 422
    assert anon.post(f"{API}/password-reset/confirm", json={"token": token, "new_password": "another good password"}).status_code == 204
    # Single use.
    assert anon.post(f"{API}/password-reset/confirm", json={"token": token, "new_password": "yet another password"}).status_code == 422
    # Existing sessions were revoked; the new password works; the old one doesn't.
    assert user_client.get(f"{API}/me").status_code == 401
    assert anon.post(f"{API}/login", json={"email": "ada@example.com", "password": PASSWORD}).status_code == 401
    assert anon.post(f"{API}/login", json={"email": "ada@example.com", "password": "another good password"}).status_code == 200


def test_expired_reset_token_is_rejected(user_client, db):
    outbox = FakeEmail()
    app.dependency_overrides[get_email_sender] = lambda: outbox
    anon = new_client()
    anon.post(f"{API}/password-reset/request", json={"email": "ada@example.com"})
    token = outbox.sent[0][1].split("token=")[1].split()[0]
    from app.models import PasswordResetToken

    record = db.exec(select(PasswordResetToken)).one()
    record.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.add(record)
    db.commit()
    response = anon.post(f"{API}/password-reset/confirm", json={"token": token, "new_password": "another good password"})
    assert response.status_code == 422
