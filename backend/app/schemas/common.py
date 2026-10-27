from typing import Annotated

from pydantic import BaseModel, StringConstraints

# Strings are trimmed; a title made only of spaces is rejected.
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
LongText = Annotated[str, StringConstraints(max_length=100_000)]
ShortText = Annotated[str, StringConstraints(max_length=20_000)]


class Page[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int


class Message(BaseModel):
    detail: str
