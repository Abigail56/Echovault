from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "EchoVault Nexus"
    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = (
        "postgresql+psycopg://echovault:change-me@127.0.0.1:5433/echovault"
    )
    TEST_DATABASE_URL: str | None = None

    # Signs short-lived access tokens. Must be long and random.
    JWT_SECRET_KEY: str = Field(min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, ge=1, le=60)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=14, ge=1, le=90)
    PASSWORD_RESET_EXPIRE_MINUTES: int = Field(default=30, ge=5, le=240)

    # Origin of the Next.js app. Used for CORS and for password-reset links.
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Cookies. COOKIE_SECURE must be true whenever the site is served over HTTPS.
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: Literal["lax", "strict"] = "lax"
    COOKIE_DOMAIN: str | None = None

    # Only enable when the API sits behind a proxy you control (e.g. the
    # Next.js rewrite), otherwise clients could spoof X-Forwarded-For.
    TRUST_PROXY_HEADERS: bool = False

    # Only for automated browser tests, which register many users from one IP.
    # Refused in production (see the validator below).
    RATE_LIMIT_ENABLED: bool = True

    # Requests larger than this are rejected before reaching the handlers.
    MAX_REQUEST_BYTES: int = 1_000_000

    # Optional AI provider. Empty AI_PROVIDER disables the assistant.
    AI_PROVIDER: Literal["", "anthropic", "openai_compatible"] = ""
    AI_API_KEY: str = ""
    AI_MODEL: str = ""
    AI_BASE_URL: str = ""
    AI_TIMEOUT_SECONDS: float = 45.0
    AI_MAX_SOURCES: int = Field(default=6, ge=1, le=12)

    # Optional SMTP settings for password-reset email.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_STARTTLS: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("AI_PROVIDER", mode="before")
    @classmethod
    def _normalise_provider(cls, value: str | None) -> str:
        return (value or "").strip().lower()

    @model_validator(mode="after")
    def _forbid_unsafe_production_settings(self) -> "Settings":
        if self.ENVIRONMENT == "production" and not self.RATE_LIMIT_ENABLED:
            raise ValueError("RATE_LIMIT_ENABLED cannot be false in production")
        return self

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def email_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_FROM)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
