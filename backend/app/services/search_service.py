"""Global keyword search (PostgreSQL full-text search — not semantic search)."""

import uuid

from sqlalchemy import func, literal
from sqlmodel import Session, col, select

from app.models import Decision, KnowledgeItem, KnowledgeTag, Project, ProjectStatus, Tag
from app.schemas.search import DashboardStats, SearchHit, SearchResults
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


def search(db: Session, owner_id: uuid.UUID, q: str, limit: int) -> SearchResults:
    terms = query_terms(q)
    tsq = build_tsquery(q)

    # Knowledge: text match, or a tag that starts with the query.
    kv = knowledge_vector()
    tag_hit = (
        select(KnowledgeTag.knowledge_item_id)
        .join(Tag, col(Tag.id) == col(KnowledgeTag.tag_id))
        .where(Tag.owner_id == owner_id, col(Tag.name).ilike(f"{escape_like(q.strip().lower())}%", escape="\\"))
    )
    knowledge_rows = db.exec(
        select(KnowledgeItem)
        .where(
            KnowledgeItem.owner_id == owner_id,
            text_match(kv, tsq, KnowledgeItem.title, q) | col(KnowledgeItem.id).in_(tag_hit),
        )
        .order_by(_ordering(kv, tsq), col(KnowledgeItem.updated_at).desc())
        .limit(limit)
    ).all()

    pv = project_vector()
    project_rows = db.exec(
        select(Project)
        .where(Project.owner_id == owner_id, text_match(pv, tsq, Project.name, q))
        .order_by(_ordering(pv, tsq), col(Project.updated_at).desc())
        .limit(limit)
    ).all()

    dv = decision_vector()
    decision_rows = db.exec(
        select(Decision)
        .where(Decision.owner_id == owner_id, text_match(dv, tsq, Decision.title, q))
        .order_by(_ordering(dv, tsq), col(Decision.updated_at).desc())
        .limit(limit)
    ).all()

    knowledge = [
        SearchHit(type="knowledge", id=k.id, title=k.title, excerpt=make_excerpt(k.content, terms, 180), updated_at=k.updated_at)
        for k in knowledge_rows
    ]
    projects = [
        SearchHit(type="project", id=p.id, title=p.name, excerpt=make_excerpt(p.description, terms, 180), updated_at=p.updated_at)
        for p in project_rows
    ]
    decisions = [
        SearchHit(
            type="decision",
            id=d.id,
            title=d.title,
            excerpt=make_excerpt(" ".join([d.decision, d.context, d.reasoning]), terms, 180),
            updated_at=d.updated_at,
        )
        for d in decision_rows
    ]
    return SearchResults(
        query=q,
        knowledge=knowledge,
        projects=projects,
        decisions=decisions,
        total=len(knowledge) + len(projects) + len(decisions),
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
        knowledge_count=count(select(func.count()).select_from(KnowledgeItem).where(KnowledgeItem.owner_id == owner_id)),
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
