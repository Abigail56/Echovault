"""Work out what a file really is from its bytes (never from its name).

Only a small, safe set of types is accepted. SVG and HTML are deliberately
rejected: they can contain scripts that would run if the file were opened in
a browser.
"""

from dataclasses import dataclass

from app.models.attachment import FileKind


@dataclass(frozen=True)
class DetectedType:
    kind: FileKind
    content_type: str
    extension: str


_SIGNATURES: list[tuple[bytes, DetectedType]] = [
    (b"\x89PNG\r\n\x1a\n", DetectedType(FileKind.IMAGE, "image/png", "png")),
    (b"\xff\xd8\xff", DetectedType(FileKind.IMAGE, "image/jpeg", "jpg")),
    (b"GIF87a", DetectedType(FileKind.IMAGE, "image/gif", "gif")),
    (b"GIF89a", DetectedType(FileKind.IMAGE, "image/gif", "gif")),
    (b"%PDF-", DetectedType(FileKind.PDF, "application/pdf", "pdf")),
]

ACCEPTED_DESCRIPTION = "PNG, JPEG, GIF or WebP images, PDF documents, or plain-text / Markdown / CSV files"

_TEXT_MARKERS = (b"<svg", b"<!doctype html", b"<html", b"<script")


def _looks_like_text(head: bytes) -> bool:
    if b"\x00" in head:
        return False
    try:
        head.decode("utf-8")
    except UnicodeDecodeError as exc:
        # A multi-byte character may be cut off at the end of the sample.
        if exc.start < len(head) - 4:
            return False
    lowered = head[:2048].lower().lstrip()
    return not any(marker in lowered for marker in _TEXT_MARKERS)


def detect_type(head: bytes) -> DetectedType | None:
    """Return the detected type, or None if the file is not an accepted type."""
    for signature, detected in _SIGNATURES:
        if head.startswith(signature):
            return detected
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return DetectedType(FileKind.IMAGE, "image/webp", "webp")
    if head and _looks_like_text(head):
        return DetectedType(FileKind.TEXT, "text/plain; charset=utf-8", "txt")
    return None


def clean_filename(name: str | None, fallback_extension: str) -> str:
    """A display-safe file name: no folders, control characters or huge lengths."""
    base = (name or "").replace("\\", "/").split("/")[-1]
    base = "".join(ch for ch in base if ch.isprintable() and ch not in '"<>|*?:').strip(" .")
    if not base:
        base = f"file.{fallback_extension}"
    if len(base) > 120:
        stem, dot, ext = base.rpartition(".")
        base = (stem[:100] + "…" + dot + ext[:10]) if dot else base[:120]
    return base
