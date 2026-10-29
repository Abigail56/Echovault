import uuid

from fastapi import APIRouter, BackgroundTasks, File, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import DbSession, OwnerId
from app.core.config import settings
from app.core.rate_limit import limiter
from app.models import FileKind
from app.schemas.attachment import AttachmentDetail, AttachmentPublic, StorageUsage
from app.services import attachment_service
from app.services.errors import NotFoundError
from app.services.extraction import ocr_available

router = APIRouter(tags=["attachments"])


@router.post(
    "/knowledge/{item_id}/attachments", response_model=AttachmentPublic, status_code=status.HTTP_201_CREATED
)
def upload_attachment(
    item_id: uuid.UUID,
    db: DbSession,
    owner_id: OwnerId,
    background: BackgroundTasks,
    file: UploadFile = File(...),
) -> AttachmentPublic:
    limiter.hit(f"upload:{owner_id}", limit=60, window_seconds=600)
    attachment = attachment_service.save_upload(db, owner_id, item_id, file.file, file.filename)
    # Text extraction (OCR) can take seconds, so it runs after the response is sent.
    background.add_task(attachment_service.run_extraction, attachment.id)
    return AttachmentPublic.from_row(attachment)


@router.get("/knowledge/{item_id}/attachments", response_model=list[AttachmentPublic])
def list_attachments(item_id: uuid.UUID, db: DbSession, owner_id: OwnerId) -> list[AttachmentPublic]:
    grouped = attachment_service.list_for_notes(db, owner_id, [item_id])
    return [AttachmentPublic.from_row(a) for a in grouped.get(item_id, [])]


@router.get("/attachments/usage", response_model=StorageUsage)
def storage_usage(db: DbSession, owner_id: OwnerId) -> StorageUsage:
    return StorageUsage(
        used_bytes=attachment_service.storage_used(db, owner_id),
        quota_bytes=settings.USER_STORAGE_QUOTA_BYTES,
        max_file_bytes=settings.MAX_UPLOAD_BYTES,
        max_files_per_note=settings.MAX_ATTACHMENTS_PER_NOTE,
        ocr_available=ocr_available(),
    )


@router.get("/attachments/{attachment_id}", response_model=AttachmentDetail)
def get_attachment(attachment_id: uuid.UUID, db: DbSession, owner_id: OwnerId) -> AttachmentDetail:
    a = attachment_service.get_owned(db, owner_id, attachment_id)
    return AttachmentDetail(**AttachmentPublic.from_row(a).model_dump(), extracted_text=a.extracted_text)


@router.get("/attachments/{attachment_id}/file", response_class=FileResponse)
def download_attachment(
    attachment_id: uuid.UUID, db: DbSession, owner_id: OwnerId, download: bool = False
) -> FileResponse:
    a = attachment_service.get_owned(db, owner_id, attachment_id)
    path = attachment_service.file_path(a)
    if not path.exists():
        raise NotFoundError("Attachment file is missing")
    # Only images are shown inline; everything else is always downloaded.
    inline = a.kind == FileKind.IMAGE and not download
    response = FileResponse(
        path,
        media_type=a.content_type,
        filename=a.filename,
        content_disposition_type="inline" if inline else "attachment",
    )
    response.headers["Cache-Control"] = "private, max-age=300"
    response.headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
    return response


@router.post("/attachments/{attachment_id}/extract", response_model=AttachmentPublic)
def retry_extraction(
    attachment_id: uuid.UUID, db: DbSession, owner_id: OwnerId, background: BackgroundTasks
) -> AttachmentPublic:
    limiter.hit(f"extract:{owner_id}", limit=20, window_seconds=600)
    a = attachment_service.retry_extraction(db, owner_id, attachment_id)
    background.add_task(attachment_service.run_extraction, a.id)
    return AttachmentPublic.from_row(a)


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(attachment_id: uuid.UUID, db: DbSession, owner_id: OwnerId) -> None:
    attachment_service.delete_attachment(db, owner_id, attachment_id)
