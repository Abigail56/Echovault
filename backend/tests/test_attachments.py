"""File and screenshot attachments: safety checks, storage, text extraction,
and how attached text shows up in search, the assistant and exports.

OCR tests need the free Tesseract program and are skipped if it isn't installed.
"""

import io
from pathlib import Path

import pytest
from PIL import Image, ImageDraw, ImageFont

from app.ai.providers import get_ai_provider
from app.core.config import settings
from app.main import app
from app.models import Attachment
from app.services.extraction import ocr_available
from app.services.file_types import clean_filename, detect_type

needs_ocr = pytest.mark.skipif(not ocr_available(), reason="Tesseract is not installed")


def make_note(client, title="Rate limiting", content="Notes about limits") -> str:
    response = client.post("/api/v1/knowledge", json={"title": title, "content": content})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def upload(client, note_id, name, data: bytes):
    return client.post(f"/api/v1/knowledge/{note_id}/attachments", files={"file": (name, data)})


def png_bytes(text: str = "", size=(900, 220)) -> bytes:
    image = Image.new("RGB", size, "white")
    if text:
        ImageDraw.Draw(image).text((30, 70), text, fill="black", font=ImageFont.load_default(size=56))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def pdf_bytes(text: str) -> bytes:
    """A tiny but valid one-page PDF with a real text layer."""
    stream = f"BT /F1 18 Tf 72 720 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{o:010d} 00000 n \n".encode() for o in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


# --- File type detection -------------------------------------------------------


def test_detects_types_from_bytes_not_names():
    assert detect_type(png_bytes()).content_type == "image/png"
    assert detect_type(pdf_bytes("hi")).kind == "pdf"
    assert detect_type(b"RIFF\x00\x00\x00\x00WEBPVP8 ").content_type == "image/webp"
    assert detect_type("Plain notes, café ✓".encode()).kind == "text"
    for dangerous in (b"<svg onload=alert(1)>", b"<!DOCTYPE html><p>x", b"  <script>alert(1)</script>"):
        assert detect_type(dangerous) is None
    assert detect_type(b"MZ\x90\x00\x03\x00\x00\x00") is None  # a Windows program


def test_clean_filename():
    assert clean_filename("../../etc/passwd", "txt") == "passwd"
    assert clean_filename('C:\\Users\\me\\shot<1>.png', "png") == "shot1.png"
    assert clean_filename("", "png") == "file.png"
    assert len(clean_filename("a" * 300 + ".pdf", "pdf")) <= 120


# --- Uploading -------------------------------------------------------------------


def test_rejected_upload_leaves_no_file_behind(user_client):
    note_id = make_note(user_client)
    before = set(Path(settings.ATTACHMENTS_DIR).iterdir())
    assert upload(user_client, note_id, "x.svg", b"<svg></svg>").status_code == 422
    assert set(Path(settings.ATTACHMENTS_DIR).iterdir()) == before


def test_upload_text_file_extracts_text(user_client):
    note_id = make_note(user_client)
    response = upload(user_client, note_id, "meeting.md", b"# Meeting\nWe chose 100 requests per minute.")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["filename"] == "meeting.md"
    assert body["kind"] == "text"

    # The test client runs background extraction before returning.
    detail = user_client.get(f"/api/v1/attachments/{body['id']}").json()
    assert detail["extraction_status"] == "done"
    assert "100 requests per minute" in detail["extracted_text"]

    note = user_client.get(f"/api/v1/knowledge/{note_id}").json()
    assert [a["id"] for a in note["attachments"]] == [body["id"]]
    assert note["attachments"][0]["text_chars"] > 0
    listing = user_client.get("/api/v1/knowledge").json()["items"][0]
    assert listing["attachment_count"] == 1


def test_upload_pdf_extracts_text_layer(user_client):
    note_id = make_note(user_client)
    body = upload(user_client, note_id, "report.pdf", pdf_bytes("Quarterly budget approved")).json()
    detail = user_client.get(f"/api/v1/attachments/{body['id']}").json()
    assert detail["kind"] == "pdf"
    assert detail["extraction_status"] == "done"
    assert "Quarterly budget approved" in detail["extracted_text"]


def test_rejects_unsupported_and_dangerous_files(user_client):
    note_id = make_note(user_client)
    for name, data in [
        ("logo.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
        ("page.png", b"<!doctype html><script>alert(1)</script>"),  # lies about its type
        ("app.exe", b"MZ\x90\x00" + b"\x00" * 100),
        ("empty.txt", b""),
    ]:
        response = upload(user_client, note_id, name, data)
        assert response.status_code == 422, name
    assert user_client.get(f"/api/v1/knowledge/{note_id}/attachments").json() == []


def test_damaged_image_is_rejected(user_client):
    note_id = make_note(user_client)
    response = upload(user_client, note_id, "broken.png", b"\x89PNG\r\n\x1a\n" + b"garbage" * 20)
    assert response.status_code == 422
    assert "damaged" in response.json()["detail"]


def test_size_limit(user_client, monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_BYTES", 2_000)
    note_id = make_note(user_client)
    response = upload(user_client, note_id, "big.txt", b"a" * 2_001)
    assert response.status_code == 422
    assert "at most" in response.json()["detail"]
    assert upload(user_client, note_id, "ok.txt", b"a" * 2_000).status_code == 201


def test_storage_quota(user_client, monkeypatch):
    monkeypatch.setattr(settings, "USER_STORAGE_QUOTA_BYTES", 3_000)
    note_id = make_note(user_client)
    assert upload(user_client, note_id, "one.txt", b"a" * 2_000).status_code == 201
    response = upload(user_client, note_id, "two.txt", b"b" * 2_000)
    assert response.status_code == 422
    assert "storage limit" in response.json()["detail"]
    usage = user_client.get("/api/v1/attachments/usage").json()
    assert usage["used_bytes"] == 2_000
    assert usage["quota_bytes"] == 3_000


def test_per_note_limit(user_client, monkeypatch):
    monkeypatch.setattr(settings, "MAX_ATTACHMENTS_PER_NOTE", 2)
    note_id = make_note(user_client)
    assert upload(user_client, note_id, "1.txt", b"one").status_code == 201
    assert upload(user_client, note_id, "2.txt", b"two").status_code == 201
    assert upload(user_client, note_id, "3.txt", b"three").status_code == 422


def test_upload_requires_csrf_and_sign_in(user_client, client):
    note_id = make_note(user_client)
    token = user_client.headers.pop("X-CSRF-Token")
    assert upload(user_client, note_id, "a.txt", b"hello").status_code == 403
    user_client.headers["X-CSRF-Token"] = token
    assert upload(client, note_id, "a.txt", b"hello").status_code in (401, 403)


# --- Ownership -------------------------------------------------------------------


def test_other_users_cannot_touch_attachments(user_client, other_client):
    note_id = make_note(user_client)
    attachment_id = upload(user_client, note_id, "secret.txt", b"my secret plan").json()["id"]

    assert upload(other_client, note_id, "x.txt", b"intrusion").status_code == 404
    assert other_client.get(f"/api/v1/knowledge/{note_id}/attachments").json() == []
    assert other_client.get(f"/api/v1/attachments/{attachment_id}").status_code == 404
    assert other_client.get(f"/api/v1/attachments/{attachment_id}/file").status_code == 404
    assert other_client.post(f"/api/v1/attachments/{attachment_id}/extract").status_code == 404
    assert other_client.delete(f"/api/v1/attachments/{attachment_id}").status_code == 404
    assert other_client.get("/api/v1/search", params={"q": "secret plan"}).json()["counts"]["knowledge"] == 0
    assert user_client.get(f"/api/v1/attachments/{attachment_id}").status_code == 200


# --- Download --------------------------------------------------------------------


def test_download_headers(user_client):
    note_id = make_note(user_client)
    image_id = upload(user_client, note_id, "shot.png", png_bytes()).json()["id"]
    text_id = upload(user_client, note_id, "notes.txt", b"hello").json()["id"]

    image = user_client.get(f"/api/v1/attachments/{image_id}/file")
    assert image.status_code == 200
    assert image.headers["content-type"] == "image/png"
    assert image.headers["content-disposition"].startswith("inline")
    assert image.headers["x-content-type-options"] == "nosniff"
    assert "sandbox" in image.headers["content-security-policy"]
    assert image.content == png_bytes()

    forced = user_client.get(f"/api/v1/attachments/{image_id}/file", params={"download": "true"})
    assert forced.headers["content-disposition"].startswith("attachment")

    text = user_client.get(f"/api/v1/attachments/{text_id}/file")
    assert text.headers["content-disposition"].startswith("attachment")
    assert text.content == b"hello"


# --- Deleting --------------------------------------------------------------------


def stored_file(db, attachment_id) -> Path:
    row = db.get(Attachment, attachment_id)
    assert row is not None
    return Path(settings.ATTACHMENTS_DIR) / row.storage_key


def test_delete_attachment_removes_file(user_client, db):
    note_id = make_note(user_client)
    attachment_id = upload(user_client, note_id, "a.txt", b"bye").json()["id"]
    path = stored_file(db, attachment_id)
    assert path.exists()
    assert user_client.delete(f"/api/v1/attachments/{attachment_id}").status_code == 204
    assert not path.exists()
    assert user_client.get(f"/api/v1/attachments/{attachment_id}").status_code == 404


def test_deleting_note_removes_its_files(user_client, db):
    note_id = make_note(user_client)
    path = stored_file(db, upload(user_client, note_id, "a.txt", b"bye").json()["id"])
    assert user_client.delete(f"/api/v1/knowledge/{note_id}").status_code == 204
    assert not path.exists()


def test_deleting_account_removes_files(user_client, db):
    from tests.conftest import PASSWORD

    note_id = make_note(user_client)
    path = stored_file(db, upload(user_client, note_id, "a.txt", b"bye").json()["id"])
    response = user_client.post("/api/v1/auth/delete-account", json={"password": PASSWORD})
    assert response.status_code == 204, response.text
    assert not path.exists()


# --- Search, assistant and export ------------------------------------------------


def test_search_finds_text_inside_attachments(user_client):
    note_id = make_note(user_client, title="Launch checklist", content="See the attached file.")
    upload(user_client, note_id, "invoice.txt", b"Payment to Contoso for hosting renewal")
    results = user_client.get("/api/v1/search", params={"q": "contoso"}).json()
    assert results["counts"]["knowledge"] == 1
    hit = results["knowledge"][0]
    assert hit["id"] == note_id
    assert hit["label"] == "In attachment: invoice.txt"
    assert "Contoso" in hit["excerpt"]

    # The vault's own search box uses the note text only.
    own = user_client.get("/api/v1/search", params={"q": "checklist"}).json()["knowledge"][0]
    assert own["label"] is None


def test_assistant_reads_attachment_text(user_client):
    from tests.test_assistant import FakeProvider

    provider = FakeProvider(reply="The vendor is Contoso [1].")
    app.dependency_overrides[get_ai_provider] = lambda: provider
    note_id = make_note(user_client, title="Hosting", content="Screenshot of the invoice below.")
    upload(user_client, note_id, "invoice.txt", b"Hosting vendor: Contoso Ltd")

    response = user_client.post("/api/v1/assistant/ask", json={"question": "Which vendor is Contoso?"})
    assert response.status_code == 200, response.text
    assert [s["id"] for s in response.json()["sources"]] == [note_id]
    sent = provider.calls[0][1]
    assert "[Attached file: invoice.txt]" in sent
    assert "Contoso Ltd" in sent


def test_export_includes_attachment_text(user_client):
    note_id = make_note(user_client)
    upload(user_client, note_id, "a.txt", b"exported words")
    export = user_client.get("/api/v1/auth/export").json()
    assert export["format_version"] == 2
    [item] = export["attachments"]
    assert item["note_id"] == note_id
    assert item["extracted_text"] == "exported words"


# --- OCR (screenshots) -----------------------------------------------------------


@needs_ocr
def test_screenshot_text_is_extracted(user_client):
    note_id = make_note(user_client)
    body = upload(user_client, note_id, "screenshot.png", png_bytes("Deploy failed at 3pm")).json()
    detail = user_client.get(f"/api/v1/attachments/{body['id']}").json()
    assert detail["extraction_status"] == "done"
    assert "deploy" in detail["extracted_text"].lower()


def test_screenshot_without_ocr_reports_unavailable(user_client, monkeypatch):
    monkeypatch.setattr("app.services.extraction.ocr_available", lambda: False)
    note_id = make_note(user_client)
    body = upload(user_client, note_id, "screenshot.png", png_bytes("Hello")).json()
    detail = user_client.get(f"/api/v1/attachments/{body['id']}").json()
    assert detail["extraction_status"] == "unavailable"
    assert detail["extracted_text"] == ""

    # Once OCR is available, the user can retry.
    monkeypatch.setattr("app.services.extraction.ocr_available", lambda: True)
    monkeypatch.setattr("app.services.extraction._ocr_png", lambda _path: "Hello world")
    assert user_client.post(f"/api/v1/attachments/{body['id']}/extract").status_code == 200
    detail = user_client.get(f"/api/v1/attachments/{body['id']}").json()
    assert detail["extraction_status"] == "done"
    assert detail["extracted_text"] == "Hello world"


def test_vault_filter_includes_attachment_text(user_client):
    note_id = make_note(user_client, title="Receipts", content="")
    upload(user_client, note_id, "r.txt", b"Fabrikam office chairs")
    items = user_client.get("/api/v1/knowledge", params={"q": "fabrikam"}).json()["items"]
    assert [i["id"] for i in items] == [note_id]


def test_extraction_after_delete_is_harmless(user_client, db):
    from app.services.attachment_service import run_extraction

    note_id = make_note(user_client)
    attachment_id = upload(user_client, note_id, "a.txt", b"bye").json()["id"]
    user_client.delete(f"/api/v1/knowledge/{note_id}")
    run_extraction(attachment_id)  # must not raise
