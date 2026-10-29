"""Attachments: upload, store, extract text, download and delete.

Safety rules:
* The file type is detected from its bytes; SVG/HTML and unknown types are refused.
* Size limits per file, a storage quota per user, and a cap per note.
* Files are stored outside any web-served folder under random names.
* Every read and write checks that the attachment belongs to the signed-in user.
"""

import hashlib
import logging
import secrets
import uuid
from pathlib import Path
from typing import BinaryIO

from PIL import Image
from sqlalchemy import func, update
from sqlmodel import Session, col, select

from app.core.config import settings
from app.db.session import engine
from app.models import Attachment, ExtractionStatus, FileKind, KnowledgeItem
from app.services.errors import InvalidInputError, NotFoundError
from app.services.extraction import extract
from app.services.search_vectors import attachment_vector
from app.services.file_types import ACCEPTED_DESCRIPTION, clean_filename, detect_type

logger = logging.getLogger(__name__)
CHUNK = 1024 * 1024


def storage_dir() -> Path:
    path = Path(settings.ATTACHMENTS_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def file_path(attachment: Attachment) -> Path:
    return storage_dir() / attachment.storage_key


def _owned_note(db: Session, owner_id: uuid.UUID, note_id: uuid.UUID) -> KnowledgeItem:
    note = db.exec(select(KnowledgeItem).where(KnowledgeItem.id == note_id, KnowledgeItem.owner_id == owner_id)).first()
    if note is None:
        raise NotFoundError("Knowledge item not found")
    return note


def get_owned(db: Session, owner_id: uuid.UUID, attachment_id: uuid.UUID) -> Attachment:
    attachment = db.exec(
        select(Attachment).where(Attachment.id == attachment_id, Attachment.owner_id == owner_id)
    ).first()
    if attachment is None:
        raise NotFoundError("Attachment not found")
    return attachment


def list_for_notes(db: Session, owner_id: uuid.UUID, note_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[Attachment]]:
    if not note_ids:
        return {}
    rows = db.exec(
        select(Attachment)
        .where(Attachment.owner_id == owner_id, col(Attachment.knowledge_item_id).in_(note_ids))
        .order_by(col(Attachment.created_at))
    ).all()
    grouped: dict[uuid.UUID, list[Attachment]] = {nid: [] for nid in note_ids}
    for row in rows:
        grouped[row.knowledge_item_id].append(row)
    return grouped


def storage_used(db: Session, owner_id: uuid.UUID) -> int:
    return int(db.exec(select(func.coalesce(func.sum(Attachment.size_bytes), 0)).where(Attachment.owner_id == owner_id)).one())


def save_upload(
    db: Session, owner_id: uuid.UUID, note_id: uuid.UUID, stream: BinaryIO, original_name: str | None
) -> Attachment:
    note = _owned_note(db, owner_id, note_id)
    count = db.exec(select(func.count()).select_from(Attachment).where(Attachment.knowledge_item_id == note.id)).one()
    if count >= settings.MAX_ATTACHMENTS_PER_NOTE:
        raise InvalidInputError(f"A note can have at most {settings.MAX_ATTACHMENTS_PER_NOTE} attachments")

    remaining_quota = settings.USER_STORAGE_QUOTA_BYTES - storage_used(db, owner_id)
    limit = min(settings.MAX_UPLOAD_BYTES, remaining_quota)

    storage_key = secrets.token_hex(16)
    target = storage_dir() / storage_key
    digest = hashlib.sha256()
    size = 0
    head = b""
    try:
        # Stream to disk, stopping as soon as a limit is crossed.
        with target.open("wb") as out:
            while chunk := stream.read(CHUNK):
                size += len(chunk)
                if size > limit:
                    if limit < settings.MAX_UPLOAD_BYTES:
                        raise InvalidInputError("You've reached your storage limit. Delete some attachments to free space.")
                    raise InvalidInputError(f"Files can be at most {settings.MAX_UPLOAD_BYTES // 1_000_000} MB")
                if len(head) < 8192:
                    head += chunk[: 8192 - len(head)]
                digest.update(chunk)
                out.write(chunk)
        if size == 0:
            raise InvalidInputError("The file is empty")
        detected = detect_type(head)
        if detected is None:
            raise InvalidInputError(f"This file type isn't supported. Upload {ACCEPTED_DESCRIPTION}.")
        if detected.kind == FileKind.IMAGE:
            try:
                with Image.open(target) as image:
                    image.verify()
            except Exception:
                raise InvalidInputError("The image file is damaged or not a real image") from None
    except BaseException:
        target.unlink(missing_ok=True)
        raise

    attachment = Attachment(
        owner_id=owner_id,
        knowledge_item_id=note.id,
        filename=clean_filename(original_name, detected.extension),
        kind=detected.kind,
        content_type=detected.content_type,
        size_bytes=size,
        sha256=digest.hexdigest(),
        storage_key=storage_key,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def run_extraction(attachment_id: uuid.UUID) -> None:
    """Background job: extract text and store it. Uses its own DB session."""
    with Session(engine) as db:
        attachment = db.get(Attachment, attachment_id)
        if attachment is None:
            return
        path = file_path(attachment)
        result = extract(path, FileKind(attachment.kind)) if path.exists() else None
        # OCR can take a while; the user may have deleted the file or note meanwhile.
        updated = db.exec(
            update(Attachment)
            .where(col(Attachment.id) == attachment_id)
            .values(
                extraction_status=result.status if result else ExtractionStatus.FAILED,
                extracted_text=result.text if result else "",
            )
        )
        db.commit()
        if updated.rowcount == 0:
            logger.info("Attachment was deleted before its text extraction finished")


def retry_extraction(db: Session, owner_id: uuid.UUID, attachment_id: uuid.UUID) -> Attachment:
    attachment = get_owned(db, owner_id, attachment_id)
    attachment.extraction_status = ExtractionStatus.PENDING
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def delete_attachment(db: Session, owner_id: uuid.UUID, attachment_id: uuid.UUID) -> None:
    attachment = get_owned(db, owner_id, attachment_id)
    path = file_path(attachment)
    db.delete(attachment)
    db.commit()
    path.unlink(missing_ok=True)


def storage_keys_for_note(db: Session, note_id: uuid.UUID) -> list[str]:
    return list(db.exec(select(Attachment.storage_key).where(Attachment.knowledge_item_id == note_id)).all())


def storage_keys_for_user(db: Session, owner_id: uuid.UUID) -> list[str]:
    return list(db.exec(select(Attachment.storage_key).where(Attachment.owner_id == owner_id)).all())


def remove_files(storage_keys: list[str]) -> None:
    """Delete files from disk after their database rows are gone."""
    base = storage_dir()
    for key in storage_keys:
        try:
            (base / key).unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not remove an attachment file")


def notes_matching(owner_id: uuid.UUID, tsquery):
    """Sub-query: ids of the user's notes with an attachment whose name or text matches."""
    return select(Attachment.knowledge_item_id).where(
        Attachment.owner_id == owner_id, attachment_vector().op("@@")(tsquery)
    )


def texts_for_notes(db: Session, owner_id: uuid.UUID, note_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[tuple[str, str]]]:
    """(filename, extracted text) for each note's attachments that have text."""
    out: dict[uuid.UUID, list[tuple[str, str]]] = {}
    if not note_ids:
        return out
    rows = db.exec(
        select(Attachment.knowledge_item_id, Attachment.filename, Attachment.extracted_text)
        .where(
            Attachment.owner_id == owner_id,
            col(Attachment.knowledge_item_id).in_(note_ids),
            Attachment.extracted_text != "",
        )
        .order_by(col(Attachment.created_at))
    ).all()
    for note_id, filename, text in rows:
        out.setdefault(note_id, []).append((filename, text))
    return out
