import uuid
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import delete, func, or_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, select

from app.models import KnowledgeItem, KnowledgeLink, KnowledgeTag, Tag
from app.schemas.knowledge import (
    KnowledgeCreate,
    KnowledgePublic,
    KnowledgeRef,
    KnowledgeSummary,
    KnowledgeUpdate,
    TagCount,
)
from app.services.errors import InvalidInputError, NotFoundError
from app.services.project_service import project_refs, require_project_link
from app.services.search_vectors import (
    build_tsquery,
    knowledge_vector,
    make_excerpt,
    query_terms,
    text_match,
)

KnowledgeSort = Literal["updated_at", "created_at", "title"]


def _resolve_tags(db: Session, owner_id: uuid.UUID, names: list[str]) -> list[Tag]:
    if not names:
        return []
    # INSERT ... ON CONFLICT DO NOTHING is safe when two requests add the same new tag.
    db.exec(
        insert(Tag)
        .values([{"id": uuid.uuid4(), "owner_id": owner_id, "name": n} for n in names])
        .on_conflict_do_nothing(constraint="uq_tags_owner_name")
    )
    tags = db.exec(select(Tag).where(Tag.owner_id == owner_id, col(Tag.name).in_(names))).all()
    by_name = {t.name: t for t in tags}
    return [by_name[n] for n in names if n in by_name]


def _set_related(db: Session, owner_id: uuid.UUID, item_id: uuid.UUID, related_ids: list[uuid.UUID]) -> None:
    """Replace a note's related-note links. Every target must belong to the same user."""
    wanted = {rid for rid in related_ids if rid != item_id}
    if wanted:
        owned = set(
            db.exec(
                select(KnowledgeItem.id).where(KnowledgeItem.owner_id == owner_id, col(KnowledgeItem.id).in_(wanted))
            ).all()
        )
        if owned != wanted:
            raise InvalidInputError("One of the related notes does not exist")
    db.exec(
        delete(KnowledgeLink).where(
            or_(col(KnowledgeLink.note_a_id) == item_id, col(KnowledgeLink.note_b_id) == item_id)
        )
    )
    for rid in wanted:
        a, b = sorted((item_id, rid))
        db.add(KnowledgeLink(note_a_id=a, note_b_id=b))


def _related(db: Session, item_id: uuid.UUID) -> list[KnowledgeRef]:
    other = func.coalesce(
        func.nullif(col(KnowledgeLink.note_a_id), item_id), col(KnowledgeLink.note_b_id)
    )
    rows = db.exec(
        select(KnowledgeItem.id, KnowledgeItem.title, KnowledgeItem.archived_at)
        .join(KnowledgeLink, col(KnowledgeItem.id) == other)
        .where(or_(col(KnowledgeLink.note_a_id) == item_id, col(KnowledgeLink.note_b_id) == item_id))
        .order_by(col(KnowledgeItem.title))
    ).all()
    return [KnowledgeRef(id=i, title=t, archived=a is not None) for i, t, a in rows]


def _get_owned(db: Session, owner_id: uuid.UUID, item_id: uuid.UUID) -> KnowledgeItem:
    item = db.exec(
        select(KnowledgeItem)
        .where(KnowledgeItem.id == item_id, KnowledgeItem.owner_id == owner_id)
        .options(selectinload(KnowledgeItem.tags))  # type: ignore[arg-type]
    ).first()
    if item is None:
        raise NotFoundError("Knowledge item not found")
    return item


def _serialise(items: list[KnowledgeItem], db: Session, owner_id: uuid.UUID, terms: list[str], full: bool):
    refs = project_refs(db, owner_id, {i.project_id for i in items})
    out: list[KnowledgeSummary] = []
    for item in items:
        data = {
            "id": item.id,
            "title": item.title,
            "excerpt": make_excerpt(item.content, terms),
            "tags": sorted(t.name for t in item.tags),
            "project": refs.get(item.project_id) if item.project_id else None,
            "archived_at": item.archived_at,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }
        if full:
            out.append(KnowledgePublic(**data, content=item.content, related=_related(db, item.id)))
        else:
            out.append(KnowledgeSummary(**data))
    return out


def list_knowledge(
    db: Session,
    owner_id: uuid.UUID,
    *,
    q: str | None,
    tag: str | None,
    project_id: uuid.UUID | None,
    archived: bool = False,
    sort: KnowledgeSort,
    order: Literal["asc", "desc"],
    limit: int,
    offset: int,
) -> tuple[list[KnowledgeSummary], int]:
    filters = [
        KnowledgeItem.owner_id == owner_id,
        col(KnowledgeItem.archived_at).is_not(None) if archived else col(KnowledgeItem.archived_at).is_(None),
    ]
    if project_id is not None:
        filters.append(KnowledgeItem.project_id == project_id)
    if tag:
        tagged = (
            select(KnowledgeTag.knowledge_item_id)
            .join(Tag, col(Tag.id) == col(KnowledgeTag.tag_id))
            .where(Tag.owner_id == owner_id, Tag.name == tag.strip().lower())
        )
        filters.append(col(KnowledgeItem.id).in_(tagged))
    terms: list[str] = []
    if q and q.strip():
        terms = query_terms(q)
        filters.append(text_match(knowledge_vector(), build_tsquery(q), KnowledgeItem.title, q))

    total = db.exec(select(func.count()).select_from(KnowledgeItem).where(*filters)).one()
    sort_col = col(getattr(KnowledgeItem, sort))
    sort_expr = sort_col.asc() if order == "asc" else sort_col.desc()
    items = db.exec(
        select(KnowledgeItem)
        .where(*filters)
        .options(selectinload(KnowledgeItem.tags))  # type: ignore[arg-type]
        .order_by(sort_expr, col(KnowledgeItem.id))
        .limit(limit)
        .offset(offset)
    ).all()
    return _serialise(list(items), db, owner_id, terms, full=False), total


def get_knowledge(db: Session, owner_id: uuid.UUID, item_id: uuid.UUID) -> KnowledgePublic:
    item = _get_owned(db, owner_id, item_id)
    return _serialise([item], db, owner_id, [], full=True)[0]  # type: ignore[return-value]


def create_knowledge(db: Session, owner_id: uuid.UUID, data: KnowledgeCreate) -> KnowledgePublic:
    require_project_link(db, owner_id, data.project_id)
    item = KnowledgeItem(
        owner_id=owner_id, title=data.title, content=data.content, project_id=data.project_id
    )
    item.tags = _resolve_tags(db, owner_id, data.tags)
    db.add(item)
    db.flush()  # assigns the row so links can reference it
    _set_related(db, owner_id, item.id, data.related_ids)
    db.commit()
    return get_knowledge(db, owner_id, item.id)


def update_knowledge(
    db: Session, owner_id: uuid.UUID, item_id: uuid.UUID, data: KnowledgeUpdate
) -> KnowledgePublic:
    item = _get_owned(db, owner_id, item_id)
    changes = data.model_dump(exclude_unset=True)
    if "project_id" in changes:
        require_project_link(db, owner_id, changes["project_id"])
        item.project_id = changes["project_id"]
    if changes.get("title") is not None:
        item.title = changes["title"]
    if changes.get("content") is not None:
        item.content = changes["content"]
    if changes.get("tags") is not None:
        item.tags = _resolve_tags(db, owner_id, changes["tags"])
    if changes.get("related_ids") is not None:
        _set_related(db, owner_id, item.id, changes["related_ids"])
    if changes.get("archived") is not None:
        item.archived_at = datetime.now(UTC) if changes["archived"] else None
    db.add(item)
    db.commit()
    return get_knowledge(db, owner_id, item_id)


def delete_knowledge(db: Session, owner_id: uuid.UUID, item_id: uuid.UUID) -> None:
    item = _get_owned(db, owner_id, item_id)
    db.delete(item)
    db.commit()


def list_tags(db: Session, owner_id: uuid.UUID) -> list[TagCount]:
    rows = db.exec(
        select(Tag.name, func.count(col(KnowledgeTag.knowledge_item_id)))
        .join(KnowledgeTag, col(KnowledgeTag.tag_id) == col(Tag.id))
        .where(Tag.owner_id == owner_id)
        .group_by(col(Tag.name))
        .order_by(func.count(col(KnowledgeTag.knowledge_item_id)).desc(), col(Tag.name))
    ).all()
    return [TagCount(name=name, count=count) for name, count in rows]
