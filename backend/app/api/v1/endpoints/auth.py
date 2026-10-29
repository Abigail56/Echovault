from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from app.api.deps import Auth, DbSession, require_csrf
from app.core.config import settings
from app.core.legal import CURRENT_TERMS_VERSION
from app.core.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from app.core.rate_limit import client_ip, limiter
from app.models import User
from app.schemas.auth import (
    AcceptTermsRequest,
    AuthConfig,
    ChangeEmailRequest,
    DeleteAccountRequest,
    LoginRequest,
    PasswordChangeRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    ProfileUpdate,
    RegisterRequest,
    UserPublic,
)
from app.services import auth_service
from app.services.email_service import (
    EmailSender,
    get_email_sender,
    send_email_changed_notice,
    send_password_reset,
)
from app.services.export_service import build_export

router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_CREDENTIALS = "Invalid email or password"


@router.get("/config", response_model=AuthConfig)
def auth_config() -> AuthConfig:
    return AuthConfig(password_reset_available=settings.email_configured, terms_version=CURRENT_TERMS_VERSION)


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, request: Request, response: Response, db: DbSession) -> UserPublic:
    limiter.hit(f"register:{client_ip(request)}", limit=10, window_seconds=3600)
    user = auth_service.register_user(db, body.email, body.password, body.full_name, body.terms_version)
    tokens = auth_service.start_session(db, user, request.headers.get("user-agent"))
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return UserPublic.model_validate(user)


@router.post("/login", response_model=UserPublic)
def login(body: LoginRequest, request: Request, response: Response, db: DbSession) -> UserPublic:
    limiter.hit(f"login-ip:{client_ip(request)}", limit=30, window_seconds=900)
    limiter.hit(f"login-email:{body.email}", limit=8, window_seconds=900)
    user = auth_service.authenticate(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)
    tokens = auth_service.start_session(db, user, request.headers.get("user-agent"))
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return UserPublic.model_validate(user)


@router.post(
    "/refresh",
    response_model=UserPublic,
    dependencies=[Depends(require_csrf)],
    responses={401: {"description": "Session expired"}},
)
def refresh(request: Request, response: Response, db: DbSession) -> UserPublic | JSONResponse:
    limiter.hit(f"refresh:{client_ip(request)}", limit=60, window_seconds=60)
    token = request.cookies.get(REFRESH_COOKIE)
    tokens = auth_service.rotate_session(db, token) if token else None
    if tokens is None:
        # Returned (not raised) so the cookie-clearing headers are kept.
        expired = JSONResponse({"detail": "Session expired"}, status_code=status.HTTP_401_UNAUTHORIZED)
        clear_auth_cookies(expired)
        return expired
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return UserPublic.model_validate(db.get(User, tokens.session.user_id))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_csrf)])
def logout(auth: Auth, response: Response, db: DbSession) -> None:
    auth_service.revoke_session(db, auth.session_id)
    clear_auth_cookies(response)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_csrf)])
def logout_everywhere(auth: Auth, response: Response, db: DbSession) -> None:
    """Sign out of every device, including this one."""
    auth_service.revoke_all_sessions(db, auth.user.id)
    clear_auth_cookies(response)


@router.post("/change-email", response_model=UserPublic, dependencies=[Depends(require_csrf)])
def change_email(
    body: ChangeEmailRequest,
    auth: Auth,
    db: DbSession,
    sender: Annotated[EmailSender | None, Depends(get_email_sender)],
) -> UserPublic:
    limiter.hit(f"change-email:{auth.user.id}", limit=5, window_seconds=900)
    old_email = auth_service.change_email(db, auth.user, body.new_email, body.password)
    if sender is not None:
        send_email_changed_notice(sender, old_email, auth.user.full_name)
    return UserPublic.model_validate(auth.user)


@router.post("/accept-terms", response_model=UserPublic, dependencies=[Depends(require_csrf)])
def accept_terms(body: AcceptTermsRequest, auth: Auth, db: DbSession) -> UserPublic:
    """Record acceptance of the current Terms (used after the Terms change)."""
    auth_service.accept_terms(db, auth.user, body.terms_version)
    return UserPublic.model_validate(auth.user)


@router.get("/export")
def export_data(auth: Auth, db: DbSession) -> JSONResponse:
    """Download everything stored for this account as JSON."""
    limiter.hit(f"export:{auth.user.id}", limit=10, window_seconds=3600)
    data = build_export(db, auth.user)
    filename = f"echovault-export-{datetime.now(UTC):%Y-%m-%d}.json"
    return JSONResponse(data, headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.post("/delete-account", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_csrf)])
def delete_account(body: DeleteAccountRequest, auth: Auth, response: Response, db: DbSession) -> None:
    """Permanently delete the account and everything in it. Requires the password."""
    limiter.hit(f"delete-account:{auth.user.id}", limit=5, window_seconds=900)
    auth_service.delete_account(db, auth.user, body.password)
    clear_auth_cookies(response)


@router.get("/me", response_model=UserPublic)
def me(auth: Auth) -> UserPublic:
    return UserPublic.model_validate(auth.user)


@router.patch("/me", response_model=UserPublic, dependencies=[Depends(require_csrf)])
def update_me(body: ProfileUpdate, auth: Auth, db: DbSession) -> UserPublic:
    auth.user.full_name = body.full_name
    db.add(auth.user)
    db.commit()
    db.refresh(auth.user)
    return UserPublic.model_validate(auth.user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_csrf)])
def change_password(body: PasswordChangeRequest, auth: Auth, db: DbSession) -> None:
    limiter.hit(f"change-password:{auth.user.id}", limit=5, window_seconds=900)
    auth_service.change_password(db, auth.user, body.current_password, body.new_password, auth.session_id)


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(
    body: PasswordResetRequest,
    request: Request,
    db: DbSession,
    sender: Annotated[EmailSender | None, Depends(get_email_sender)],
) -> dict[str, str]:
    if sender is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset by email is not configured on this server.",
        )
    limiter.hit(f"reset-ip:{client_ip(request)}", limit=5, window_seconds=900)
    limiter.hit(f"reset-email:{body.email}", limit=3, window_seconds=3600)
    created = auth_service.create_password_reset(db, body.email)
    if created is not None:
        user, token = created
        send_password_reset(sender, user.email, user.full_name, token)
    # Same response whether or not the account exists (no account enumeration).
    return {"detail": "If an account exists for that email, a reset link has been sent."}


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirm_password_reset(body: PasswordResetConfirm, request: Request, db: DbSession) -> None:
    limiter.hit(f"reset-confirm:{client_ip(request)}", limit=10, window_seconds=900)
    auth_service.complete_password_reset(db, body.token, body.new_password)
