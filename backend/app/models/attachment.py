import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import BigInteger, CheckConstraint, DateTime, String, Text
from sqlmodel import Field, SQLModel

from app.models.common import utcnow, uuid_pk


class ExtractionStatus(StrEnum):
    PENDING = "pending"  # waiting for / running text extraction
    DONE = "done"  # text was extracted (may be empty if none was found)
    FAILED = "failed"  # the file could not be read
    UNAVAILABLE = "unavailable"  # OCR engine not installed on the server


class FileKind(StrEnum):
    IMAGE = "image"
    PDF = "pdf"
    TEXT = "text"


class Attachment(SQLModel, table=True):
    """A file attached to a note. The bytes live on disk under storage_key."""

    __tablename__ = "attachments"
    __table_args__ = (
        CheckConstraint("kind IN ('image', 'pdf', 'text')", name="ck_attachments_kind"),
        CheckConstraint(
            "extraction_status IN ('pending', 'done', 'failed', 'unavailable')",
            name="ck_attachments_extraction_status",
        ),
    )

    id: uuid.UUID = uuid_pk()
    owner_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    knowledge_item_id: uuid.UUID = Field(foreign_key="knowledge_items.id", ondelete="CASCADE", index=True)
    # Cleaned original name, for display and downloads only (never used as a path).
    filename: str = Field(max_length=255)
    kind: FileKind = Field(sa_type=String(10))
    # Detected from the file's bytes, not trusted from the browser.
    content_type: str = Field(max_length=100)
    size_bytes: int = Field(sa_type=BigInteger)
    sha256: str = Field(max_length=64)
    # Random name of the file on disk.
    storage_key: str = Field(max_length=64, unique=True)
    extraction_status: ExtractionStatus = Field(default=ExtractionStatus.PENDING, sa_type=String(12))
    extracted_text: str = Field(default="", sa_type=Text)
    created_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True))
