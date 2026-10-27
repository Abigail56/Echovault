import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Query, status

from app.api.deps import DbSession, OwnerId
from app.models import ProjectStatus
from app.schemas.common import Page
from app.schemas.project import ProjectCreate, ProjectPublic, ProjectUpdate
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=Page[ProjectPublic])
def list_projects(
    db: DbSession,
    owner_id: OwnerId,
    q: Annotated[str | None, Query(max_length=200)] = None,
    status_filter: Annotated[ProjectStatus | None, Query(alias="status")] = None,
    sort: project_service.ProjectSort = "updated_at",
    order: Literal["asc", "desc"] = "desc",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ProjectPublic]:
    items, total = project_service.list_projects(
        db, owner_id, q=q, status=status_filter, sort=sort, order=order, limit=limit, offset=offset
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=ProjectPublic, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, db: DbSession, owner_id: OwnerId) -> ProjectPublic:
    return project_service.create_project(db, owner_id, body)


@router.get("/{project_id}", response_model=ProjectPublic)
def get_project(project_id: uuid.UUID, db: DbSession, owner_id: OwnerId) -> ProjectPublic:
    return project_service.get_project(db, owner_id, project_id)


@router.patch("/{project_id}", response_model=ProjectPublic)
def update_project(
    project_id: uuid.UUID, body: ProjectUpdate, db: DbSession, owner_id: OwnerId
) -> ProjectPublic:
    return project_service.update_project(db, owner_id, project_id, body)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: uuid.UUID, db: DbSession, owner_id: OwnerId) -> None:
    project_service.delete_project(db, owner_id, project_id)
