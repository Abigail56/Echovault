import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Query, status

from app.api.deps import DbSession, OwnerId
from app.models import DecisionStatus
from app.schemas.common import Page
from app.schemas.decision import DecisionCreate, DecisionPublic, DecisionSummary, DecisionUpdate
from app.services import decision_service

router = APIRouter(prefix="/decisions", tags=["decisions"])


@router.get("", response_model=Page[DecisionSummary])
def list_decisions(
    db: DbSession,
    owner_id: OwnerId,
    q: Annotated[str | None, Query(max_length=200)] = None,
    project_id: uuid.UUID | None = None,
    status_filter: Annotated[DecisionStatus | None, Query(alias="status")] = None,
    sort: decision_service.DecisionSort = "updated_at",
    order: Literal["asc", "desc"] = "desc",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[DecisionSummary]:
    items, total = decision_service.list_decisions(
        db, owner_id, q=q, project_id=project_id, status=status_filter, sort=sort, order=order, limit=limit, offset=offset
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=DecisionPublic, status_code=status.HTTP_201_CREATED)
def create_decision(body: DecisionCreate, db: DbSession, owner_id: OwnerId) -> DecisionPublic:
    return decision_service.create_decision(db, owner_id, body)


@router.get("/{decision_id}", response_model=DecisionPublic)
def get_decision(decision_id: uuid.UUID, db: DbSession, owner_id: OwnerId) -> DecisionPublic:
    return decision_service.get_decision(db, owner_id, decision_id)


@router.patch("/{decision_id}", response_model=DecisionPublic)
def update_decision(
    decision_id: uuid.UUID, body: DecisionUpdate, db: DbSession, owner_id: OwnerId
) -> DecisionPublic:
    return decision_service.update_decision(db, owner_id, decision_id, body)


@router.delete("/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_decision(decision_id: uuid.UUID, db: DbSession, owner_id: OwnerId) -> None:
    decision_service.delete_decision(db, owner_id, decision_id)
