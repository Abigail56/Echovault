"""Outgoing email. Uses the standard library's smtplib — no extra dependency."""

import logging
import smtplib
from email.message import EmailMessage
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class SmtpEmailSender:
    def send(self, to: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = settings.SMTP_FROM
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            if settings.SMTP_STARTTLS:
                smtp.starttls()
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)


def get_email_sender() -> EmailSender | None:
    """None means email is not configured (the reset flow reports that)."""
    return SmtpEmailSender() if settings.email_configured else None


def send_password_reset(sender: EmailSender, to: str, name: str, token: str) -> None:
    link = f"{settings.FRONTEND_ORIGIN.rstrip('/')}/reset-password?token={token}"
    body = (
        f"Hi {name},\n\n"
        "Someone asked to reset the password for your EchoVault Nexus account.\n"
        f"If it was you, open this link within {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes:\n\n"
        f"{link}\n\n"
        "If you did not ask for this, you can ignore this email.\n"
    )
    try:
        sender.send(to, "Reset your EchoVault Nexus password", body)
    except Exception:
        # Never log the token or the recipient's address.
        logger.exception("Failed to send password reset email")


def send_email_changed_notice(sender: EmailSender, old_email: str, name: str) -> None:
    """Warn the previous address (without revealing the new one) so a hijack can be noticed."""
    body = (
        f"Hi {name},\n\n"
        "The sign-in email for your EchoVault Nexus account was just changed to a new address.\n"
        "If you made this change, you don't need to do anything.\n"
        "If you didn't, reply to the operator's contact address immediately.\n"
    )
    try:
        sender.send(old_email, "Your EchoVault Nexus email address was changed", body)
    except Exception:
        logger.exception("Failed to send email-changed notice")
