"""Export of everything a user has stored, as one JSON document.

Only rows owned by the requesting user are read, so an export can never
include another account's data.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, select

from app.models import Attachment, Decision, KnowledgeItem, KnowledgeLink, Project, User

EXPORT_FORMAT_VERSION = 2


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def build_export(db: Session, user: User) -> dict[str, Any]:
    owner_id = user.id
    projects = db.exec(select(Project).where(Project.owner_id == owner_id).order_by(col(Project.created_at))).all()
    notes = db.exec(
        select(KnowledgeItem)
        .where(KnowledgeItem.owner_id == owner_id)
        .options(selectinload(KnowledgeItem.tags))  # type: ignore[arg-type]
        .order_by(col(KnowledgeItem.created_at))
    ).all()
    decisions = db.exec(select(Decision).where(Decision.owner_id == owner_id).order_by(col(Decision.created_at))).all()

    attachments = db.exec(
        select(Attachment).where(Attachment.owner_id == owner_id).order_by(col(Attachment.created_at))
    ).all()

    note_ids = [n.id for n in notes]
    related: dict[uuid.UUID, list[str]] = {nid: [] for nid in note_ids}
    if note_ids:
        links = db.exec(
            select(KnowledgeLink).where(
                or_(col(KnowledgeLink.note_a_id).in_(note_ids), col(KnowledgeLink.note_b_id).in_(note_ids))
            )
        ).all()
        for link in links:
            # Links only ever join notes of the same owner, but check anyway.
            if link.note_a_id in related and link.note_b_id in related:
                related[link.note_a_id].append(str(link.note_b_id))
                related[link.note_b_id].append(str(link.note_a_id))

    return {
        "format": "echovault-export",
        "format_version": EXPORT_FORMAT_VERSION,
        "exported_at": datetime.now(UTC).isoformat(),
        "account": {
            "email": user.email,
            "full_name": user.full_name,
            "created_at": _iso(user.created_at),
            "terms_version": user.terms_version,
            "terms_accepted_at": _iso(user.terms_accepted_at),
        },
        "projects": [
            {
                "id": str(p.id),
                "name": p.name,
                "description": p.description,
                "status": str(p.status),
                "created_at": _iso(p.created_at),
                "updated_at": _iso(p.updated_at),
            }
            for p in projects
        ],
        "notes": [
            {
                "id": str(n.id),
                "title": n.title,
                "content": n.content,
                "tags": sorted(t.name for t in n.tags),
                "project_id": str(n.project_id) if n.project_id else None,
                "related_note_ids": sorted(related.get(n.id, [])),
                "archived_at": _iso(n.archived_at),
                "created_at": _iso(n.created_at),
                "updated_at": _iso(n.updated_at),
            }
            for n in notes
        ],
        "decisions": [
            {
                "id": str(d.id),
                "title": d.title,
                "status": str(d.status),
                "context": d.context,
                "problem": d.problem,
                "alternatives": d.alternatives,
                "selected_option": d.decision,
                "reasoning": d.reasoning,
                "expected_outcome": d.expected_outcome,
                "actual_outcome": d.actual_outcome,
                "project_id": str(d.project_id) if d.project_id else None,
                "reviewed_at": _iso(d.reviewed_at),
                "created_at": _iso(d.created_at),
                "updated_at": _iso(d.updated_at),
            }
            for d in decisions
        ],
        # File contents are not embedded; the extracted text and file details are.
        "attachments": [
            {
                "id": str(a.id),
                "note_id": str(a.knowledge_item_id),
                "filename": a.filename,
                "content_type": a.content_type,
                "size_bytes": a.size_bytes,
                "sha256": a.sha256,
                "extraction_status": str(a.extraction_status),
                "extracted_text": a.extracted_text,
                "created_at": _iso(a.created_at),
            }
            for a in attachments
        ],
    }
