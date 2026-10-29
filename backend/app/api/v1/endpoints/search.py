from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbSession, OwnerId
from app.schemas.search import DashboardStats, SearchResults
from app.services import search_service

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResults)
def search(
    db: DbSession,
    owner_id: OwnerId,
    q: Annotated[str, Query(min_length=1, max_length=200)],
    type_: Annotated[search_service.SearchType, Query(alias="type")] = "all",
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SearchResults:
    """Keyword search (PostgreSQL full-text with prefix matching) across the user's own records."""
    return search_service.search(db, owner_id, q, type_, limit, offset)


@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(db: DbSession, owner_id: OwnerId) -> DashboardStats:
    return search_service.dashboard_stats(db, owner_id)
