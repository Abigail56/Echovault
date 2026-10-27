import secrets
import uuid
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session

from app.core.cookies import ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER
from app.core.security import InvalidTokenError, decode_access_token
from app.db.session import get_session
from app.models import User
from app.services import auth_service

DbSession = Annotated[Session, Depends(get_session)]

_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@dataclass
class AuthContext:
    user: User
    session_id: uuid.UUID


def _unauthorised(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def get_auth(request: Request, db: DbSession) -> AuthContext:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise _unauthorised()
    try:
        user_id, session_id = decode_access_token(token)
    except InvalidTokenError:
        raise _unauthorised("Session expired") from None
    if auth_service.get_active_session(db, session_id, user_id) is None:
        raise _unauthorised("Session expired")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorised()
    return AuthContext(user=user, session_id=session_id)


def require_csrf(request: Request) -> None:
    """Reject state-changing requests without a matching CSRF header."""
    if request.method not in _UNSAFE_METHODS:
        return
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get(CSRF_HEADER)
    if not cookie or not header or not secrets.compare_digest(cookie, header):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF check failed")


Auth = Annotated[AuthContext, Depends(get_auth)]


def current_user_id(auth: Auth) -> uuid.UUID:
    return auth.user.id


OwnerId = Annotated[uuid.UUID, Depends(current_user_id)]
