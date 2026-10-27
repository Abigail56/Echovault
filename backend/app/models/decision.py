import uuid

from sqlalchemy import Index, Text
from sqlmodel import Field

from app.models.common import TimestampedModel, uuid_pk


class Decision(TimestampedModel, table=True):
    __tablename__ = "decisions"
    __table_args__ = (Index("ix_decisions_owner_updated", "owner_id", "updated_at"),)

    id: uuid.UUID = uuid_pk()
    owner_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    project_id: uuid.UUID | None = Field(
        default=None, foreign_key="projects.id", ondelete="SET NULL", index=True
    )
    title: str = Field(max_length=300)
    context: str = Field(default="", sa_type=Text)
    decision: str = Field(default="", sa_type=Text)
    reasoning: str = Field(default="", sa_type=Text)
    alternatives: str = Field(default="", sa_type=Text)
    expected_outcome: str = Field(default="", sa_type=Text)
    actual_outcome: str = Field(default="", sa_type=Text)
