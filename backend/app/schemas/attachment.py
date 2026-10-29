import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.attachment import Attachment, ExtractionStatus, FileKind


class AttachmentPublic(BaseModel):
    id: uuid.UUID
    knowledge_item_id: uuid.UUID
    filename: str
    kind: FileKind
    content_type: str
    size_bytes: int
    extraction_status: ExtractionStatus
    # Length only; the text itself comes from GET /attachments/{id}.
    text_chars: int
    created_at: datetime

    @classmethod
    def from_row(cls, a: Attachment) -> "AttachmentPublic":
        return cls(
            id=a.id,
            knowledge_item_id=a.knowledge_item_id,
            filename=a.filename,
            kind=FileKind(a.kind),
            content_type=a.content_type,
            size_bytes=a.size_bytes,
            extraction_status=ExtractionStatus(a.extraction_status),
            text_chars=len(a.extracted_text),
            created_at=a.created_at,
        )


class AttachmentDetail(AttachmentPublic):
    extracted_text: str


class StorageUsage(BaseModel):
    used_bytes: int
    quota_bytes: int
    max_file_bytes: int
    ocr_available: bool
