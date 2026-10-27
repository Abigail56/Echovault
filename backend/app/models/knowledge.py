import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Text, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.models.common import TimestampedModel, utcnow, uuid_pk


class KnowledgeTag(SQLModel, table=True):
    """Association table between knowledge items and tags."""

    __tablename__ = "knowledge_item_tags"

    knowledge_item_id: uuid.UUID = Field(
        foreign_key="knowledge_items.id", ondelete="CASCADE", primary_key=True
    )
    tag_id: uuid.UUID = Field(foreign_key="tags.id", ondelete="CASCADE", primary_key=True, index=True)


class Tag(SQLModel, table=True):
    """Tags are per-user so one user's tags never show up for another."""

    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("owner_id", "name", name="uq_tags_owner_name"),)

    id: uuid.UUID = uuid_pk()
    owner_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    # Stored lower-cased and trimmed.
    name: str = Field(max_length=50)
    created_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True))


class KnowledgeItem(TimestampedModel, table=True):
    __tablename__ = "knowledge_items"
    __table_args__ = (Index("ix_knowledge_items_owner_updated", "owner_id", "updated_at"),)

    id: uuid.UUID = uuid_pk()
    owner_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    # Deleting a project keeps its knowledge; the link is simply cleared.
    project_id: uuid.UUID | None = Field(
        default=None, foreign_key="projects.id", ondelete="SET NULL", index=True
    )
    title: str = Field(max_length=300)
    content: str = Field(default="", sa_type=Text)

    tags: list[Tag] = Relationship(link_model=KnowledgeTag)
