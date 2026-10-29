"""Work out what a file really is from its bytes (never from its name).

Only a small, safe set of types is accepted. SVG and HTML are deliberately
rejected: they can contain scripts that would run if the file were opened in
a browser.
"""

import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePath

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

ACCEPTED_DESCRIPTION = (
    "images (PNG, JPEG, GIF, WebP), PDF, Word (.doc, .docx), Excel (.xls, .xlsx), "
    "PowerPoint (.ppt, .pptx), RTF, or text files (.txt, .md, .csv)"
)

DOCX = DetectedType(FileKind.DOCUMENT, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx")
XLSX = DetectedType(FileKind.DOCUMENT, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx")
PPTX = DetectedType(FileKind.DOCUMENT, "application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx")
RTF = DetectedType(FileKind.DOCUMENT, "application/rtf", "rtf")
# Old (97-2003) Office files share one container format, so the extension says which it is.
_LEGACY_OFFICE = {
    ".doc": DetectedType(FileKind.DOCUMENT, "application/msword", "doc"),
    ".xls": DetectedType(FileKind.DOCUMENT, "application/vnd.ms-excel", "xls"),
    ".ppt": DetectedType(FileKind.DOCUMENT, "application/vnd.ms-powerpoint", "ppt"),
}
_ZIP = b"PK\x03\x04"
_OLE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
_OOXML_PARTS = (("word/", DOCX), ("xl/", XLSX), ("ppt/", PPTX))

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
    if head.startswith(b"{\\rtf"):
        return RTF
    if head and _looks_like_text(head):
        return DetectedType(FileKind.TEXT, "text/plain; charset=utf-8", "txt")
    return None


def _detect_ooxml(path: Path) -> DetectedType | None:
    """A .docx/.xlsx/.pptx is a ZIP of XML parts. Anything else in a ZIP is refused."""
    try:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            if len(infos) > 10_000:
                return None
            names = {i.filename for i in infos}
            types = archive.getinfo("[Content_Types].xml")
            if types.file_size > 1_000_000:
                return None
            manifest = archive.read(types).lower()
    except (zipfile.BadZipFile, KeyError, OSError, RuntimeError):
        return None
    # Macro-enabled files (.docm, .xlsm, .pptm) can carry code; never accept them, even renamed.
    if b"macroenabled" in manifest or any(n.lower().endswith("vbaproject.bin") for n in names):
        return None
    for prefix, detected in _OOXML_PARTS:
        if any(n.startswith(prefix) for n in names):
            return detected
    return None


def detect_file(path: Path, head: bytes, original_name: str | None) -> DetectedType | None:
    """Like detect_type, but also recognises Office files (which need the whole file or its name)."""
    if head.startswith(_ZIP):
        return _detect_ooxml(path)
    if head.startswith(_OLE):
        return _LEGACY_OFFICE.get(PurePath(original_name or "").suffix.lower())
    return detect_type(head)


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
