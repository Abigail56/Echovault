import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

Question = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=2000)]


class AssistantQuestion(BaseModel):
    question: Question
    project_id: uuid.UUID | None = None


class AssistantSource(BaseModel):
    # The number the model uses to cite this source, e.g. [1].
    ref: int
    # Which kind of record this is, so the UI can link to it.
    type: Literal["knowledge", "decision"]
    id: uuid.UUID
    title: str
    excerpt: str
    cited: bool


class AssistantAnswer(BaseModel):
    answer: str
    # False when nothing relevant was found and no provider was called.
    grounded: bool
    sources: list[AssistantSource]
    provider: str | None
    model: str | None


class AssistantStatus(BaseModel):
    configured: bool
    provider: str | None
    model: str | None
