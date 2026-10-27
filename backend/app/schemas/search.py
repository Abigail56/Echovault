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


class SearchResults(BaseModel):
    query: str
    knowledge: list[SearchHit]
    projects: list[SearchHit]
    decisions: list[SearchHit]
    total: int


class DashboardStats(BaseModel):
    knowledge_count: int
    project_count: int
    active_project_count: int
    decision_count: int
    tag_count: int
