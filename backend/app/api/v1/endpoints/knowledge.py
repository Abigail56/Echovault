import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Query, status

from app.api.deps import DbSession, OwnerId
from app.schemas.common import Page
from app.schemas.knowledge import (
    KnowledgeCreate,
    KnowledgePublic,
    KnowledgeSummary,
    KnowledgeUpdate,
    TagCount,
)
from app.services import knowledge_service

router = APIRouter(tags=["knowledge"])


@router.get("/knowledge", response_model=Page[KnowledgeSummary])
def list_knowledge(
    db: DbSession,
    owner_id: OwnerId,
    q: Annotated[str | None, Query(max_length=200)] = None,
    tag: Annotated[str | None, Query(max_length=50)] = None,
    project_id: uuid.UUID | None = None,
    archived: bool = False,
    sort: knowledge_service.KnowledgeSort = "updated_at",
    order: Literal["asc", "desc"] = "desc",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[KnowledgeSummary]:
    items, total = knowledge_service.list_knowledge(
        db, owner_id, q=q, tag=tag, project_id=project_id, archived=archived, sort=sort, order=order, limit=limit, offset=offset
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("/knowledge", response_model=KnowledgePublic, status_code=status.HTTP_201_CREATED)
def create_knowledge(body: KnowledgeCreate, db: DbSession, owner_id: OwnerId) -> KnowledgePublic:
    return knowledge_service.create_knowledge(db, owner_id, body)


@router.get("/knowledge/{item_id}", response_model=KnowledgePublic)
def get_knowledge(item_id: uuid.UUID, db: DbSession, owner_id: OwnerId) -> KnowledgePublic:
    return knowledge_service.get_knowledge(db, owner_id, item_id)


@router.patch("/knowledge/{item_id}", response_model=KnowledgePublic)
def update_knowledge(
    item_id: uuid.UUID, body: KnowledgeUpdate, db: DbSession, owner_id: OwnerId
) -> KnowledgePublic:
    return knowledge_service.update_knowledge(db, owner_id, item_id, body)


@router.delete("/knowledge/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge(item_id: uuid.UUID, db: DbSession, owner_id: OwnerId) -> None:
    knowledge_service.delete_knowledge(db, owner_id, item_id)


@router.get("/tags", response_model=list[TagCount])
def list_tags(db: DbSession, owner_id: OwnerId) -> list[TagCount]:
    return knowledge_service.list_tags(db, owner_id)
