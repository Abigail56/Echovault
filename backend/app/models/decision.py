import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Index, String, Text
from sqlmodel import Field

from app.models.common import TimestampedModel, uuid_pk


class DecisionStatus(StrEnum):
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    SUPERSEDED = "superseded"
    REVIEWED = "reviewed"


class Decision(TimestampedModel, table=True):
    __tablename__ = "decisions"
    __table_args__ = (
        Index("ix_decisions_owner_updated", "owner_id", "updated_at"),
        CheckConstraint(
            "status IN ('proposed', 'accepted', 'superseded', 'reviewed')",
            name="ck_decisions_status",
        ),
    )

    id: uuid.UUID = uuid_pk()
    owner_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    project_id: uuid.UUID | None = Field(
        default=None, foreign_key="projects.id", ondelete="SET NULL", index=True
    )
    title: str = Field(max_length=300)
    context: str = Field(default="", sa_type=Text)
    problem: str = Field(default="", sa_type=Text)
    # The selected option.
    decision: str = Field(default="", sa_type=Text)
    reasoning: str = Field(default="", sa_type=Text)
    alternatives: str = Field(default="", sa_type=Text)
    expected_outcome: str = Field(default="", sa_type=Text)
    actual_outcome: str = Field(default="", sa_type=Text)
    status: DecisionStatus = Field(default=DecisionStatus.ACCEPTED, sa_type=String(20))
    # Set whenever review notes are recorded or the status becomes "reviewed".
    reviewed_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
