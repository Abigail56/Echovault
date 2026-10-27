"""Password hashing, token creation and token verification.

Two kinds of credentials are issued at login:

* An **access token** — a short-lived JWT (default 15 minutes) that carries the
  user id and the id of the login session it belongs to.
* A **refresh token** — a long random string. Only its SHA-256 hash is stored
  in the database, so a leaked database does not leak usable tokens.

Both are delivered in HttpOnly cookies so page JavaScript can never read them.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import settings

password_hasher = PasswordHash((Argon2Hasher(),))

# Used to keep login timing similar whether or not the email exists.
_DUMMY_HASH = password_hasher.hash("echovault-timing-equaliser")


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        password_hasher.verify(password, _DUMMY_HASH)
        return False
    try:
        return password_hasher.verify(password, password_hash)
    except Exception:
        return False


def generate_token() -> str:
    """A URL-safe random token with 256 bits of entropy."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user_id: uuid.UUID, session_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


class InvalidTokenError(Exception):
    pass


def decode_access_token(token: str) -> tuple[uuid.UUID, uuid.UUID]:
    """Return (user_id, session_id) or raise InvalidTokenError."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub", "sid"]},
        )
        if payload.get("type") != "access":
            raise InvalidTokenError
        return uuid.UUID(payload["sub"]), uuid.UUID(payload["sid"])
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        raise InvalidTokenError from exc
