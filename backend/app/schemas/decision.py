import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.decision import DecisionStatus
from app.schemas.common import ShortText, Title
from app.schemas.project import ProjectRef


class DecisionCreate(BaseModel):
    title: Title
    context: ShortText = ""
    problem: ShortText = ""
    decision: ShortText = ""
    reasoning: ShortText = ""
    alternatives: ShortText = ""
    expected_outcome: ShortText = ""
    actual_outcome: ShortText = ""
    status: DecisionStatus = DecisionStatus.ACCEPTED
    project_id: uuid.UUID | None = None


class DecisionUpdate(BaseModel):
    title: Title | None = None
    context: ShortText | None = None
    problem: ShortText | None = None
    decision: ShortText | None = None
    reasoning: ShortText | None = None
    alternatives: ShortText | None = None
    expected_outcome: ShortText | None = None
    actual_outcome: ShortText | None = None
    status: DecisionStatus | None = None
    project_id: uuid.UUID | None = None


class DecisionSummary(BaseModel):
    id: uuid.UUID
    title: str
    excerpt: str
    project: ProjectRef | None
    status: DecisionStatus
    has_outcome: bool
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DecisionPublic(DecisionSummary):
    context: str
    problem: str
    decision: str
    reasoning: str
    alternatives: str
    expected_outcome: str
    actual_outcome: str
