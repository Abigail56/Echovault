import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.models.project import ProjectStatus

ProjectName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
ProjectDescription = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]


class ProjectCreate(BaseModel):
    name: ProjectName
    description: ProjectDescription = ""
    status: ProjectStatus = ProjectStatus.ACTIVE


class ProjectUpdate(BaseModel):
    name: ProjectName | None = None
    description: ProjectDescription | None = None
    status: ProjectStatus | None = None


class ProjectPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    knowledge_count: int = 0
    decision_count: int = 0


class ProjectRef(BaseModel):
    """The minimal project info embedded in knowledge items and decisions."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
