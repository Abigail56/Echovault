"""Turn attachments into searchable text.

* Images (e.g. screenshots): OCR with the free Tesseract engine.
* PDFs: the text layer via pypdf; scanned PDFs (no text layer) are turned into
  page images with pdftoppm and then OCR'd.
* Text files: decoded as UTF-8.

Tesseract and pdftoppm are optional system programs. If they are missing, the
result says so ("unavailable") instead of failing.
"""

import logging
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps

from app.core.config import settings
from app.models.attachment import ExtractionStatus, FileKind

logger = logging.getLogger(__name__)

MAX_TEXT_CHARS = 200_000
# Guard against "decompression bomb" images that are tiny files but enormous bitmaps.
Image.MAX_IMAGE_PIXELS = 50_000_000


@dataclass
class ExtractionResult:
    status: ExtractionStatus
    text: str = ""


def ocr_available() -> bool:
    return shutil.which("tesseract") is not None


def _tidy(text: str) -> str:
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    # Collapse runs of blank lines that OCR tends to produce.
    out: list[str] = []
    for line in lines:
        if line or (out and out[-1]):
            out.append(line)
    return "\n".join(out).strip()[:MAX_TEXT_CHARS]


def _ocr_png(png_path: Path) -> str:
    result = subprocess.run(
        ["tesseract", str(png_path), "stdout", "-l", settings.OCR_LANGUAGES, "--psm", "3"],
        capture_output=True,
        timeout=settings.OCR_TIMEOUT_SECONDS,
        check=True,
    )
    return result.stdout.decode("utf-8", errors="replace")


def _prepare_for_ocr(source: Path, target: Path) -> None:
    """Normalise an image so OCR works well: upright, greyscale, big enough."""
    with Image.open(source) as image:
        image.load()
        image = ImageOps.exif_transpose(image)
        if getattr(image, "is_animated", False):
            image.seek(0)
        image = image.convert("L")
        # Small screenshots OCR much better when enlarged.
        if image.width < 1200:
            factor = min(3, max(1, 1600 // max(image.width, 1)))
            image = image.resize((image.width * factor, image.height * factor), Image.Resampling.LANCZOS)
        image.save(target, format="PNG")


def extract_image(path: Path) -> ExtractionResult:
    if not ocr_available():
        return ExtractionResult(ExtractionStatus.UNAVAILABLE)
    with tempfile.TemporaryDirectory() as tmp:
        prepared = Path(tmp) / "page.png"
        _prepare_for_ocr(path, prepared)
        return ExtractionResult(ExtractionStatus.DONE, _tidy(_ocr_png(prepared)))


def extract_pdf(path: Path) -> ExtractionResult:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages = [(page.extract_text() or "") for page in reader.pages[:200]]
    text = _tidy("\n\n".join(pages))
    if len(text) >= 20:
        return ExtractionResult(ExtractionStatus.DONE, text)

    # No real text layer: probably a scan. OCR the first pages.
    if not ocr_available() or shutil.which("pdftoppm") is None:
        return ExtractionResult(ExtractionStatus.UNAVAILABLE if not text else ExtractionStatus.DONE, text)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ["pdftoppm", "-r", "200", "-gray", "-png", "-l", str(settings.PDF_OCR_MAX_PAGES), str(path), f"{tmp}/page"],
            capture_output=True,
            timeout=settings.OCR_TIMEOUT_SECONDS,
            check=True,
        )
        texts = [_ocr_png(png) for png in sorted(Path(tmp).glob("page*.png"))]
    return ExtractionResult(ExtractionStatus.DONE, _tidy("\n\n".join(texts)))


def extract_text_file(path: Path) -> ExtractionResult:
    return ExtractionResult(ExtractionStatus.DONE, _tidy(path.read_bytes()[: MAX_TEXT_CHARS * 4].decode("utf-8", errors="replace")))


def extract(path: Path, kind: FileKind) -> ExtractionResult:
    try:
        if kind == FileKind.IMAGE:
            return extract_image(path)
        if kind == FileKind.PDF:
            return extract_pdf(path)
        return extract_text_file(path)
    except Exception:
        # Never log file contents; the id/kind is enough to investigate.
        logger.exception("Text extraction failed for a %s attachment", kind)
        return ExtractionResult(ExtractionStatus.FAILED)
