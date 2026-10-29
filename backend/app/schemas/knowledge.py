import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

from app.schemas.attachment import AttachmentPublic
from app.schemas.common import LongText, Title
from app.schemas.project import ProjectRef

TagName = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=1, max_length=50)]


def _dedupe(tags: list[str]) -> list[str]:
    return list(dict.fromkeys(tags))


TagList = Annotated[list[TagName], Field(max_length=20), AfterValidator(_dedupe)]
RelatedIds = Annotated[list[uuid.UUID], Field(max_length=20), AfterValidator(_dedupe)]


class KnowledgeRef(BaseModel):
    id: uuid.UUID
    title: str
    archived: bool


class KnowledgeCreate(BaseModel):
    title: Title
    content: LongText = ""
    tags: TagList = []
    project_id: uuid.UUID | None = None
    related_ids: RelatedIds = []


class KnowledgeUpdate(BaseModel):
    """Every field is optional; only the fields sent are changed.

    Send ``"project_id": null`` to remove the project link.
    """

    title: Title | None = None
    content: LongText | None = None
    tags: TagList | None = None
    project_id: uuid.UUID | None = None
    related_ids: RelatedIds | None = None
    # true archives the note, false restores it.
    archived: bool | None = None


class KnowledgeSummary(BaseModel):
    id: uuid.UUID
    title: str
    excerpt: str
    tags: list[str]
    project: ProjectRef | None
    archived_at: datetime | None
    attachment_count: int = 0
    created_at: datetime
    updated_at: datetime


class KnowledgePublic(KnowledgeSummary):
    content: str
    related: list[KnowledgeRef]
    attachments: list[AttachmentPublic] = []


class TagCount(BaseModel):
    name: str
    count: int
