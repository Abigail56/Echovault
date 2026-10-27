import uuid
from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.models.common import TimestampedModel, utcnow, uuid_pk


class User(TimestampedModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = uuid_pk()
    # Always stored lower-cased; uniqueness is enforced by the database.
    email: str = Field(max_length=320, unique=True, index=True)
    full_name: str = Field(max_length=120)
    password_hash: str = Field(max_length=255)
    is_active: bool = Field(default=True)


class UserSession(SQLModel, table=True):
    """One login on one device. Logging out revokes it.

    Only hashes of refresh tokens are stored. The previous hash is kept so that
    reuse of an already-rotated refresh token can be detected.
    """

    __tablename__ = "user_sessions"

    id: uuid.UUID = uuid_pk()
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    refresh_token_hash: str = Field(max_length=64, unique=True, index=True)
    previous_refresh_token_hash: str | None = Field(default=None, max_length=64, index=True)
    user_agent: str | None = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True))
    rotated_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True))
    expires_at: datetime = Field(sa_type=DateTime(timezone=True))
    revoked_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))


class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_tokens"

    id: uuid.UUID = uuid_pk()
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    token_hash: str = Field(max_length=64, unique=True, index=True)
    created_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True))
    expires_at: datetime = Field(sa_type=DateTime(timezone=True))
    used_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
