"""Global keyword search (PostgreSQL full-text search — not semantic search)."""

import uuid
from typing import Literal

from sqlalchemy import func, literal
from sqlmodel import Session, col, select

from app.models import Decision, DecisionStatus, KnowledgeItem, KnowledgeTag, Project, ProjectStatus, Tag
from app.schemas.search import DashboardStats, SearchCounts, SearchHit, SearchResults
from app.services.search_vectors import (
    build_tsquery,
    decision_vector,
    escape_like,
    knowledge_vector,
    make_excerpt,
    project_vector,
    query_terms,
    text_match,
)


SearchType = Literal["all", "knowledge", "project", "decision"]


def search(
    db: Session, owner_id: uuid.UUID, q: str, type_: SearchType = "all", limit: int = 10, offset: int = 0
) -> SearchResults:
    """Keyword search across the user's own records.

    With type_="all", each group returns its first `limit` matches. With a
    single type, that group is paginated with `limit`/`offset`. Counts for every
    group are always returned so the UI can show filter tabs with numbers.
    """
    terms = query_terms(q)
    tsq = build_tsquery(q)

    # Knowledge: text match, or a tag that starts with the query.
    kv = knowledge_vector()
    tag_hit = (
        select(KnowledgeTag.knowledge_item_id)
        .join(Tag, col(Tag.id) == col(KnowledgeTag.tag_id))
        .where(Tag.owner_id == owner_id, col(Tag.name).ilike(f"{escape_like(q.strip().lower())}%", escape="\\"))
    )
    k_filter = [
        KnowledgeItem.owner_id == owner_id,
        text_match(kv, tsq, KnowledgeItem.title, q) | col(KnowledgeItem.id).in_(tag_hit),
    ]
    pv = project_vector()
    p_filter = [Project.owner_id == owner_id, text_match(pv, tsq, Project.name, q)]
    dv = decision_vector()
    d_filter = [Decision.owner_id == owner_id, text_match(dv, tsq, Decision.title, q)]

    def count(model, filters) -> int:
        return db.exec(select(func.count()).select_from(model).where(*filters)).one()

    counts = SearchCounts(
        knowledge=count(KnowledgeItem, k_filter),
        projects=count(Project, p_filter),
        decisions=count(Decision, d_filter),
    )

    def page(stmt, wanted: str):
        if type_ not in ("all", wanted):
            return []
        stmt = stmt.limit(limit)
        if type_ == wanted:
            stmt = stmt.offset(offset)
        return db.exec(stmt).all()

    knowledge_rows = page(
        select(KnowledgeItem).where(*k_filter).order_by(_ordering(kv, tsq), col(KnowledgeItem.updated_at).desc()),
        "knowledge",
    )
    project_rows = page(
        select(Project).where(*p_filter).order_by(_ordering(pv, tsq), col(Project.updated_at).desc()), "project"
    )
    decision_rows = page(
        select(Decision).where(*d_filter).order_by(_ordering(dv, tsq), col(Decision.updated_at).desc()), "decision"
    )

    knowledge = [
        SearchHit(
            type="knowledge",
            id=k.id,
            title=k.title,
            excerpt=make_excerpt(k.content, terms, 180),
            updated_at=k.updated_at,
            label="Archived" if k.archived_at else None,
        )
        for k in knowledge_rows
    ]
    projects = [
        SearchHit(
            type="project",
            id=p.id,
            title=p.name,
            excerpt=make_excerpt(p.description, terms, 180),
            updated_at=p.updated_at,
            label=ProjectStatus(p.status).value.replace("_", " ").capitalize(),
        )
        for p in project_rows
    ]
    decisions = [
        SearchHit(
            type="decision",
            id=d.id,
            title=d.title,
            excerpt=make_excerpt(" ".join([d.decision, d.problem, d.context, d.reasoning]), terms, 180),
            updated_at=d.updated_at,
            label=DecisionStatus(d.status).value.capitalize(),
        )
        for d in decision_rows
    ]
    return SearchResults(
        query=q,
        type=type_,
        knowledge=knowledge,
        projects=projects,
        decisions=decisions,
        counts=counts,
        total=counts.knowledge + counts.projects + counts.decisions,
        limit=limit,
        offset=offset,
    )


def _ordering(vector, tsq):
    """Best full-text matches first; ties fall back to most recently updated."""
    if tsq is None:
        return literal(0)
    return func.ts_rank(vector, tsq).desc()


def dashboard_stats(db: Session, owner_id: uuid.UUID) -> DashboardStats:
    def count(stmt) -> int:
        return db.exec(stmt).one()

    return DashboardStats(
        knowledge_count=count(
            select(func.count())
            .select_from(KnowledgeItem)
            .where(KnowledgeItem.owner_id == owner_id, col(KnowledgeItem.archived_at).is_(None))
        ),
        archived_knowledge_count=count(
            select(func.count())
            .select_from(KnowledgeItem)
            .where(KnowledgeItem.owner_id == owner_id, col(KnowledgeItem.archived_at).is_not(None))
        ),
        project_count=count(select(func.count()).select_from(Project).where(Project.owner_id == owner_id)),
        active_project_count=count(
            select(func.count())
            .select_from(Project)
            .where(Project.owner_id == owner_id, Project.status == ProjectStatus.ACTIVE)
        ),
        decision_count=count(select(func.count()).select_from(Decision).where(Decision.owner_id == owner_id)),
        tag_count=count(
            select(func.count(func.distinct(col(Tag.id))))
            .select_from(Tag)
            .join(KnowledgeTag, col(KnowledgeTag.tag_id) == col(Tag.id))
            .where(Tag.owner_id == owner_id)
        ),
    )
