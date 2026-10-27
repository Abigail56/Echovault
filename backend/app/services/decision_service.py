import uuid
from typing import Literal

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.models import Decision
from app.schemas.decision import DecisionCreate, DecisionPublic, DecisionSummary, DecisionUpdate
from app.services.errors import NotFoundError
from app.services.project_service import project_refs, require_project_link
from app.services.search_vectors import (
    build_tsquery,
    decision_vector,
    make_excerpt,
    query_terms,
    text_match,
)

DecisionSort = Literal["updated_at", "created_at", "title"]

_TEXT_FIELDS = ("context", "decision", "reasoning", "alternatives", "expected_outcome", "actual_outcome")


def _get_owned(db: Session, owner_id: uuid.UUID, decision_id: uuid.UUID) -> Decision:
    decision = db.exec(
        select(Decision).where(Decision.id == decision_id, Decision.owner_id == owner_id)
    ).first()
    if decision is None:
        raise NotFoundError("Decision not found")
    return decision


def _excerpt_source(d: Decision) -> str:
    # Prefer the decision itself, then the context, for list previews.
    return d.decision or d.context or d.reasoning


def _serialise(items: list[Decision], db: Session, owner_id: uuid.UUID, terms: list[str], full: bool):
    refs = project_refs(db, owner_id, {d.project_id for d in items})
    out: list[DecisionSummary] = []
    for d in items:
        data = {
            "id": d.id,
            "title": d.title,
            "excerpt": make_excerpt(_excerpt_source(d), terms),
            "project": refs.get(d.project_id) if d.project_id else None,
            "has_outcome": bool(d.actual_outcome.strip()),
            "created_at": d.created_at,
            "updated_at": d.updated_at,
        }
        if full:
            out.append(DecisionPublic(**data, **{f: getattr(d, f) for f in _TEXT_FIELDS}))
        else:
            out.append(DecisionSummary(**data))
    return out


def list_decisions(
    db: Session,
    owner_id: uuid.UUID,
    *,
    q: str | None,
    project_id: uuid.UUID | None,
    sort: DecisionSort,
    order: Literal["asc", "desc"],
    limit: int,
    offset: int,
) -> tuple[list[DecisionSummary], int]:
    filters = [Decision.owner_id == owner_id]
    if project_id is not None:
        filters.append(Decision.project_id == project_id)
    terms: list[str] = []
    if q and q.strip():
        terms = query_terms(q)
        filters.append(text_match(decision_vector(), build_tsquery(q), Decision.title, q))

    total = db.exec(select(func.count()).select_from(Decision).where(*filters)).one()
    sort_col = col(getattr(Decision, sort))
    sort_expr = sort_col.asc() if order == "asc" else sort_col.desc()
    items = db.exec(
        select(Decision).where(*filters).order_by(sort_expr, col(Decision.id)).limit(limit).offset(offset)
    ).all()
    return _serialise(list(items), db, owner_id, terms, full=False), total


def get_decision(db: Session, owner_id: uuid.UUID, decision_id: uuid.UUID) -> DecisionPublic:
    return _serialise([_get_owned(db, owner_id, decision_id)], db, owner_id, [], full=True)[0]  # type: ignore[return-value]


def create_decision(db: Session, owner_id: uuid.UUID, data: DecisionCreate) -> DecisionPublic:
    require_project_link(db, owner_id, data.project_id)
    decision = Decision(owner_id=owner_id, **data.model_dump())
    db.add(decision)
    db.commit()
    return get_decision(db, owner_id, decision.id)


def update_decision(
    db: Session, owner_id: uuid.UUID, decision_id: uuid.UUID, data: DecisionUpdate
) -> DecisionPublic:
    decision = _get_owned(db, owner_id, decision_id)
    changes = data.model_dump(exclude_unset=True)
    if "project_id" in changes:
        require_project_link(db, owner_id, changes["project_id"])
        decision.project_id = changes.pop("project_id")
    for field, value in changes.items():
        if value is not None:
            setattr(decision, field, value)
    db.add(decision)
    db.commit()
    return get_decision(db, owner_id, decision_id)


def delete_decision(db: Session, owner_id: uuid.UUID, decision_id: uuid.UUID) -> None:
    db.delete(_get_owned(db, owner_id, decision_id))
    db.commit()
