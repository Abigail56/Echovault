"""Turn attachments into searchable text.

* Images (e.g. screenshots): OCR with the free Tesseract engine.
* PDFs: the text layer via pypdf; scanned PDFs (no text layer) are turned into
  page images with pdftoppm and then OCR'd.
* Text files: decoded as UTF-8.
* Word, Excel and PowerPoint (.docx/.xlsx/.pptx): text read from their XML parts.
  RTF: control words stripped. Old .doc/.xls/.ppt files are stored but marked
  "unsupported" (their binary format would need an extra library).

Tesseract and pdftoppm are optional system programs. If they are missing, the
result says so ("unavailable") instead of failing.
"""

import logging
import re
import shutil
import subprocess
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree

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


# Never read more than this from one part of an Office file (guards against "zip bombs").
MAX_PART_BYTES = 20_000_000
_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
_A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
_S = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def _read_part(archive: zipfile.ZipFile, name: str) -> bytes:
    info = archive.getinfo(name)
    if info.file_size > MAX_PART_BYTES:
        raise ValueError("Part too large")
    with archive.open(info) as part:
        return part.read(MAX_PART_BYTES + 1)[:MAX_PART_BYTES]


def _numbered(names: list[str], pattern: str) -> list[str]:
    """slide10.xml after slide2.xml: sort by the number in the name."""
    regex = re.compile(pattern)
    found = [(int(m.group(1)), n) for n in names if (m := regex.fullmatch(n))]
    return [n for _, n in sorted(found)]


def _docx_text(archive: zipfile.ZipFile) -> str:
    root = ElementTree.fromstring(_read_part(archive, "word/document.xml"))
    paragraphs = []
    for para in root.iter(f"{_W}p"):
        pieces = []
        for node in para.iter():
            if node.tag == f"{_W}t" and node.text:
                pieces.append(node.text)
            elif node.tag == f"{_W}tab":
                pieces.append("\t")
            elif node.tag in (f"{_W}br", f"{_W}cr"):
                pieces.append("\n")
        paragraphs.append("".join(pieces))
    return "\n".join(paragraphs)


def _pptx_text(archive: zipfile.ZipFile) -> str:
    slides = []
    for number, name in enumerate(_numbered(archive.namelist(), r"ppt/slides/slide(\d+)\.xml"), start=1):
        root = ElementTree.fromstring(_read_part(archive, name))
        lines = ["".join(t.text or "" for t in para.iter(f"{_A}t")) for para in root.iter(f"{_A}p")]
        slides.append(f"Slide {number}\n" + "\n".join(line for line in lines if line.strip()))
    return "\n\n".join(slides)


def _xlsx_text(archive: zipfile.ZipFile) -> str:
    names = archive.namelist()
    shared: list[str] = []
    if "xl/sharedStrings.xml" in names:
        root = ElementTree.fromstring(_read_part(archive, "xl/sharedStrings.xml"))
        shared = ["".join(t.text or "" for t in si.iter(f"{_S}t")) for si in root.iter(f"{_S}si")]
    sheets = []
    for number, name in enumerate(_numbered(names, r"xl/worksheets/sheet(\d+)\.xml"), start=1):
        root = ElementTree.fromstring(_read_part(archive, name))
        rows = []
        for row in root.iter(f"{_S}row"):
            cells = []
            for cell in row.iter(f"{_S}c"):
                kind = cell.get("t")
                if kind == "inlineStr":
                    cells.append("".join(t.text or "" for t in cell.iter(f"{_S}t")))
                    continue
                value = cell.find(f"{_S}v")
                text = value.text if value is not None and value.text else ""
                if kind == "s" and text.isdigit() and int(text) < len(shared):
                    text = shared[int(text)]
                cells.append(text)
            if any(cells):
                rows.append("\t".join(cells))
        sheets.append(f"Sheet {number}\n" + "\n".join(rows))
    return "\n\n".join(sheets)


_RTF_GROUPS_TO_DROP = re.compile(r"\\\*|\\(?:fonttbl|colortbl|stylesheet|info|pict|header|footer)\b")


def _rtf_text(raw: str) -> str:
    """A small RTF reader: keeps the visible text, drops formatting and hidden groups."""
    out: list[str] = []
    skip_depth: list[int] = []
    depth = 0
    i = 0
    while i < len(raw):
        ch = raw[i]
        if ch == "{":
            depth += 1
            if _RTF_GROUPS_TO_DROP.match(raw, i + 1):
                skip_depth.append(depth)
            i += 1
        elif ch == "}":
            if skip_depth and skip_depth[-1] == depth:
                skip_depth.pop()
            depth -= 1
            i += 1
        elif ch == "\\":
            m = re.compile(r"\\([a-zA-Z]+)(-?\d+)? ?|\\'([0-9a-fA-F]{2})|\\(.)").match(raw, i)
            if not m:
                i += 1
                continue
            i = m.end()
            if skip_depth:
                continue
            word, hex_code, symbol = m.group(1), m.group(3), m.group(4)
            if word in ("par", "line"):
                out.append("\n")
            elif word == "tab":
                out.append("\t")
            elif word == "u" and m.group(2):
                out.append(chr(int(m.group(2)) % 65536))
                # RTF follows \uN with one fallback character for old readers; skip it.
                if i < len(raw) and raw[i] not in "\\{}":
                    i += 1
            elif hex_code:
                out.append(bytes([int(hex_code, 16)]).decode("cp1252", errors="replace"))
            elif symbol in ("\\", "{", "}"):
                out.append(symbol)
        else:
            if not skip_depth and ch not in "\r\n":
                out.append(ch)
            i += 1
    return "".join(out)


def extract_document(path: Path, content_type: str) -> ExtractionResult:
    if content_type == "application/rtf":
        return ExtractionResult(ExtractionStatus.DONE, _tidy(_rtf_text(path.read_bytes()[: MAX_TEXT_CHARS * 4].decode("latin-1"))))
    readers = {"wordprocessingml": _docx_text, "presentationml": _pptx_text, "spreadsheetml": _xlsx_text}
    reader = next((fn for key, fn in readers.items() if key in content_type), None)
    if reader is None:
        return ExtractionResult(ExtractionStatus.UNSUPPORTED)
    with zipfile.ZipFile(path) as archive:
        return ExtractionResult(ExtractionStatus.DONE, _tidy(reader(archive)))


def extract(path: Path, kind: FileKind, content_type: str = "") -> ExtractionResult:
    try:
        if kind == FileKind.IMAGE:
            return extract_image(path)
        if kind == FileKind.PDF:
            return extract_pdf(path)
        if kind == FileKind.DOCUMENT:
            return extract_document(path, content_type)
        return extract_text_file(path)
    except Exception:
        # Never log file contents; the id/kind is enough to investigate.
        logger.exception("Text extraction failed for a %s attachment", kind)
        return ExtractionResult(ExtractionStatus.FAILED)
