import uuid
from typing import Literal

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.models import Decision, KnowledgeItem, Project, ProjectStatus
from app.schemas.project import ProjectCreate, ProjectPublic, ProjectRef, ProjectUpdate
from app.services.errors import InvalidInputError, NotFoundError
from app.services.search_vectors import build_tsquery, project_vector, text_match

ProjectSort = Literal["updated_at", "created_at", "name"]


def get_owned_project(db: Session, owner_id: uuid.UUID, project_id: uuid.UUID) -> Project:
    """Fetch a project only if it belongs to owner_id; otherwise 404.

    We answer 404 (not 403) for other users' records so IDs cannot be probed.
    """
    project = db.exec(
        select(Project).where(Project.id == project_id, Project.owner_id == owner_id)
    ).first()
    if project is None:
        raise NotFoundError("Project not found")
    return project


def require_project_link(db: Session, owner_id: uuid.UUID, project_id: uuid.UUID | None) -> None:
    """Validate a project_id supplied in a request body."""
    if project_id is None:
        return
    exists = db.exec(
        select(Project.id).where(Project.id == project_id, Project.owner_id == owner_id)
    ).first()
    if exists is None:
        raise InvalidInputError("The selected project does not exist")


def project_refs(db: Session, owner_id: uuid.UUID, ids: set[uuid.UUID | None]) -> dict[uuid.UUID, ProjectRef]:
    """Load project names for many records in one query (avoids N+1)."""
    wanted = {i for i in ids if i is not None}
    if not wanted:
        return {}
    rows = db.exec(
        select(Project.id, Project.name).where(col(Project.id).in_(wanted), Project.owner_id == owner_id)
    ).all()
    return {pid: ProjectRef(id=pid, name=name) for pid, name in rows}


def _counts(db: Session, project_ids: list[uuid.UUID]) -> tuple[dict, dict]:
    if not project_ids:
        return {}, {}
    k = db.exec(
        select(KnowledgeItem.project_id, func.count())
        .where(col(KnowledgeItem.project_id).in_(project_ids))
        .group_by(col(KnowledgeItem.project_id))
    ).all()
    d = db.exec(
        select(Decision.project_id, func.count())
        .where(col(Decision.project_id).in_(project_ids))
        .group_by(col(Decision.project_id))
    ).all()
    return dict(k), dict(d)


def to_public(project: Project, knowledge_count: int = 0, decision_count: int = 0) -> ProjectPublic:
    return ProjectPublic(
        id=project.id,
        name=project.name,
        description=project.description,
        # The column is a plain string; convert so the API always emits a valid status.
        status=ProjectStatus(project.status),
        created_at=project.created_at,
        updated_at=project.updated_at,
        knowledge_count=knowledge_count,
        decision_count=decision_count,
    )


def list_projects(
    db: Session,
    owner_id: uuid.UUID,
    *,
    q: str | None,
    status: ProjectStatus | None,
    sort: ProjectSort,
    order: Literal["asc", "desc"],
    limit: int,
    offset: int,
) -> tuple[list[ProjectPublic], int]:
    filters = [Project.owner_id == owner_id]
    if status is not None:
        filters.append(Project.status == status)
    if q and q.strip():
        filters.append(text_match(project_vector(), build_tsquery(q), Project.name, q))

    total = db.exec(select(func.count()).select_from(Project).where(*filters)).one()
    sort_col = col(getattr(Project, sort))
    sort_expr = sort_col.asc() if order == "asc" else sort_col.desc()
    projects = db.exec(
        select(Project).where(*filters).order_by(sort_expr, col(Project.id)).limit(limit).offset(offset)
    ).all()
    k, d = _counts(db, [p.id for p in projects])
    return [to_public(p, k.get(p.id, 0), d.get(p.id, 0)) for p in projects], total


def get_project(db: Session, owner_id: uuid.UUID, project_id: uuid.UUID) -> ProjectPublic:
    project = get_owned_project(db, owner_id, project_id)
    k, d = _counts(db, [project.id])
    return to_public(project, k.get(project.id, 0), d.get(project.id, 0))


def create_project(db: Session, owner_id: uuid.UUID, data: ProjectCreate) -> ProjectPublic:
    project = Project(owner_id=owner_id, **data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return to_public(project)


def update_project(db: Session, owner_id: uuid.UUID, project_id: uuid.UUID, data: ProjectUpdate) -> ProjectPublic:
    project = get_owned_project(db, owner_id, project_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in changes.items():
        setattr(project, field, value)
    db.add(project)
    db.commit()
    return get_project(db, owner_id, project_id)


def delete_project(db: Session, owner_id: uuid.UUID, project_id: uuid.UUID) -> None:
    project = get_owned_project(db, owner_id, project_id)
    # Linked knowledge and decisions are kept (FK is ON DELETE SET NULL).
    db.delete(project)
    db.commit()
