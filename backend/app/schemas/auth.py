import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints


def _normalise_email(value: str) -> str:
    return value.strip().lower()


def _check_password(value: str) -> str:
    if not value.strip():
        raise ValueError("Password cannot be only whitespace")
    return value


NormalisedEmail = Annotated[EmailStr, AfterValidator(_normalise_email)]
# NIST SP 800-63B: favour length over composition rules.
Password = Annotated[str, Field(min_length=10, max_length=128), AfterValidator(_check_password)]
FullName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class RegisterRequest(BaseModel):
    email: NormalisedEmail
    password: Password
    full_name: FullName


class LoginRequest(BaseModel):
    email: NormalisedEmail
    # Not validated for length here: we never want to tell an attacker anything
    # beyond "invalid credentials".
    password: str = Field(min_length=1, max_length=256)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    created_at: datetime


class ProfileUpdate(BaseModel):
    full_name: FullName


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: Password


class PasswordResetRequest(BaseModel):
    email: NormalisedEmail


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: Password


class AuthConfig(BaseModel):
    password_reset_available: bool
