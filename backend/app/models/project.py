import uuid
from enum import StrEnum

from sqlalchemy import CheckConstraint, Index, String
from sqlmodel import Field

from app.models.common import TimestampedModel, uuid_pk


class ProjectStatus(StrEnum):
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Project(TimestampedModel, table=True):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'on_hold', 'completed', 'archived')",
            name="ck_projects_status",
        ),
        Index("ix_projects_owner_updated", "owner_id", "updated_at"),
    )

    id: uuid.UUID = uuid_pk()
    owner_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    name: str = Field(max_length=200)
    description: str = Field(default="", max_length=5000)
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE, sa_type=String(20))
