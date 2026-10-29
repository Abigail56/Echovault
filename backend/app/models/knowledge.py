import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, Text, UniqueConstraint
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


class KnowledgeLink(SQLModel, table=True):
    """An undirected "related notes" link, stored once with the smaller id first."""

    __tablename__ = "knowledge_links"
    __table_args__ = (CheckConstraint("note_a_id < note_b_id", name="ck_knowledge_links_order"),)

    note_a_id: uuid.UUID = Field(foreign_key="knowledge_items.id", ondelete="CASCADE", primary_key=True)
    note_b_id: uuid.UUID = Field(foreign_key="knowledge_items.id", ondelete="CASCADE", primary_key=True, index=True)


class KnowledgeItem(TimestampedModel, table=True):
    __tablename__ = "knowledge_items"
    __table_args__ = (
        Index("ix_knowledge_items_owner_updated", "owner_id", "updated_at"),
        Index("ix_knowledge_items_owner_archived", "owner_id", "archived_at"),
    )

    id: uuid.UUID = uuid_pk()
    owner_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    # Deleting a project keeps its knowledge; the link is simply cleared.
    project_id: uuid.UUID | None = Field(
        default=None, foreign_key="projects.id", ondelete="SET NULL", index=True
    )
    title: str = Field(max_length=300)
    content: str = Field(default="", sa_type=Text)
    # Archived notes are hidden from the default vault list and the assistant.
    archived_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))

    tags: list[Tag] = Relationship(link_model=KnowledgeTag)
