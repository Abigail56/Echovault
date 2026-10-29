import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ResultType = Literal["knowledge", "project", "decision"]


class SearchHit(BaseModel):
    type: ResultType
    id: uuid.UUID
    title: str
    excerpt: str
    updated_at: datetime
    # Short status shown next to the result, e.g. "Archived" or "Accepted".
    label: str | None = None


class SearchCounts(BaseModel):
    knowledge: int
    projects: int
    decisions: int


class SearchResults(BaseModel):
    query: str
    type: Literal["all", "knowledge", "project", "decision"]
    knowledge: list[SearchHit]
    projects: list[SearchHit]
    decisions: list[SearchHit]
    counts: SearchCounts
    total: int
    limit: int
    offset: int


class DashboardStats(BaseModel):
    knowledge_count: int
    archived_knowledge_count: int
    project_count: int
    active_project_count: int
    decision_count: int
    tag_count: int
