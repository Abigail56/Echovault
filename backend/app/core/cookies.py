"""Authentication cookies.

* ``ev_access``  — short-lived JWT, HttpOnly, sent to every API route.
* ``ev_refresh`` — long-lived refresh token, HttpOnly, sent ONLY to /auth routes.
* ``ev_csrf``    — random value readable by page JavaScript. The frontend copies
  it into an ``X-CSRF-Token`` header on every state-changing request. Another
  website can make the browser send cookies, but cannot read this value, so it
  cannot produce a matching header (the "double-submit cookie" pattern).
"""

import secrets

from fastapi import Response

from app.core.config import settings

ACCESS_COOKIE = "ev_access"
REFRESH_COOKIE = "ev_refresh"
CSRF_COOKIE = "ev_csrf"
CSRF_HEADER = "x-csrf-token"

_API_PATH = settings.API_V1_PREFIX
_AUTH_PATH = f"{settings.API_V1_PREFIX}/auth"


def _common() -> dict:
    return {
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
        "domain": settings.COOKIE_DOMAIN,
    }


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        path=_API_PATH,
        **_common(),
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=True,
        path=_AUTH_PATH,
        **_common(),
    )
    response.set_cookie(
        CSRF_COOKIE,
        secrets.token_urlsafe(32),
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=False,
        path="/",
        **_common(),
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path=_API_PATH, **_common())
    response.delete_cookie(REFRESH_COOKIE, path=_AUTH_PATH, **_common())
    response.delete_cookie(CSRF_COOKIE, path="/", **_common())
