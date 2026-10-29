"""Account and session logic.

Session model (explained):
* Login creates a ``UserSession`` row and returns a fresh refresh token.
* Every access token carries the session id; requests are rejected once the
  session is revoked, so logout takes effect immediately.
* Refreshing *rotates* the refresh token: the old one stops working. If an old
  token is presented again well after rotation, we assume it was stolen and
  revoke the whole session.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select, update

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.core.legal import CURRENT_TERMS_VERSION
from app.models import PasswordResetToken, User, UserSession
from app.services.errors import ConflictError, InvalidInputError

# Two tabs refreshing at the same moment both present the same old token.
# Within this window the second attempt is refused without revoking anything.
ROTATION_GRACE = timedelta(seconds=30)


@dataclass
class IssuedTokens:
    access_token: str
    refresh_token: str
    session: UserSession


def _now() -> datetime:
    return datetime.now(UTC)


def register_user(db: Session, email: str, password: str, full_name: str, terms_version: str) -> User:
    if terms_version != CURRENT_TERMS_VERSION:
        raise InvalidInputError("The Terms have been updated. Please reload the page and review them.")
    if db.exec(select(User.id).where(User.email == email)).first():
        raise ConflictError("An account with this email already exists")
    user = User(
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
        terms_version=terms_version,
        terms_accepted_at=_now(),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Two simultaneous registrations: the unique index decides the winner.
        db.rollback()
        raise ConflictError("An account with this email already exists") from None
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = db.exec(select(User).where(User.email == email)).first()
    if not verify_password(password, user.password_hash if user else None):
        return None
    if user is None or not user.is_active:
        return None
    return user


def start_session(db: Session, user: User, user_agent: str | None) -> IssuedTokens:
    refresh_token = generate_token()
    session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        user_agent=(user_agent or "")[:255] or None,
        expires_at=_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return IssuedTokens(create_access_token(user.id, session.id), refresh_token, session)


def get_active_session(db: Session, session_id: uuid.UUID, user_id: uuid.UUID) -> UserSession | None:
    session = db.get(UserSession, session_id)
    if session is None or session.user_id != user_id:
        return None
    if session.revoked_at is not None or session.expires_at <= _now():
        return None
    return session


def rotate_session(db: Session, refresh_token: str) -> IssuedTokens | None:
    token_hash = hash_token(refresh_token)
    # FOR UPDATE serialises concurrent refreshes of the same token.
    session = db.exec(
        select(UserSession).where(UserSession.refresh_token_hash == token_hash).with_for_update()
    ).first()

    if session is None:
        reused = db.exec(
            select(UserSession).where(UserSession.previous_refresh_token_hash == token_hash)
        ).first()
        if reused and reused.revoked_at is None and _now() - reused.rotated_at > ROTATION_GRACE:
            reused.revoked_at = _now()
            db.add(reused)
            db.commit()
        return None

    if session.revoked_at is not None or session.expires_at <= _now():
        return None
    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        return None

    new_token = generate_token()
    session.previous_refresh_token_hash = token_hash
    session.refresh_token_hash = hash_token(new_token)
    session.rotated_at = _now()
    db.add(session)
    db.commit()
    db.refresh(session)
    return IssuedTokens(create_access_token(user.id, session.id), new_token, session)


def revoke_session(db: Session, session_id: uuid.UUID) -> None:
    db.exec(
        update(UserSession)
        .where(col(UserSession.id) == session_id, col(UserSession.revoked_at).is_(None))
        .values(revoked_at=_now())
    )
    db.commit()


def revoke_all_sessions(db: Session, user_id: uuid.UUID, except_session: uuid.UUID | None = None) -> None:
    stmt = update(UserSession).where(
        col(UserSession.user_id) == user_id, col(UserSession.revoked_at).is_(None)
    )
    if except_session is not None:
        stmt = stmt.where(col(UserSession.id) != except_session)
    db.exec(stmt.values(revoked_at=_now()))
    db.commit()


def change_password(db: Session, user: User, current: str, new: str, keep_session: uuid.UUID) -> None:
    if not verify_password(current, user.password_hash):
        raise InvalidInputError("Current password is incorrect")
    user.password_hash = hash_password(new)
    db.add(user)
    db.commit()
    # Sign out every other device.
    revoke_all_sessions(db, user.id, except_session=keep_session)


def delete_account(db: Session, user: User, password: str) -> None:
    """Permanently delete the user and (via ON DELETE CASCADE) all their data."""
    if not verify_password(password, user.password_hash):
        raise InvalidInputError("Password is incorrect")
    db.delete(user)
    db.commit()


def create_password_reset(db: Session, email: str) -> tuple[User, str] | None:
    """Returns (user, raw token) or None if no active account has that email."""
    user = db.exec(select(User).where(User.email == email)).first()
    if user is None or not user.is_active:
        return None
    # Only the newest link should work.
    db.exec(
        update(PasswordResetToken)
        .where(col(PasswordResetToken.user_id) == user.id, col(PasswordResetToken.used_at).is_(None))
        .values(used_at=_now())
    )
    token = generate_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=_now() + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
        )
    )
    db.commit()
    return user, token


def complete_password_reset(db: Session, token: str, new_password: str) -> None:
    record = db.exec(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(token)).with_for_update()
    ).first()
    if record is None or record.used_at is not None or record.expires_at <= _now():
        raise InvalidInputError("This reset link is invalid or has expired")
    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        raise InvalidInputError("This reset link is invalid or has expired")
    record.used_at = _now()
    user.password_hash = hash_password(new_password)
    db.add(record)
    db.add(user)
    db.commit()
    revoke_all_sessions(db, user.id)
