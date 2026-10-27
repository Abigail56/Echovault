"""PostgreSQL full-text search helpers shared by the vault, search and assistant.

The ``*_vector`` expressions MUST stay identical to the GIN index expressions in
the initial Alembic migration, otherwise PostgreSQL falls back to a slow scan.
"""

import re
from typing import Literal

from sqlalchemy import ColumnElement, TextClause, func, or_, text
from sqlmodel import col

from app.models import Decision, KnowledgeItem, Project

_WORD = re.compile(r"\w+", re.UNICODE)
MAX_TERMS = 12


def literal_regconfig() -> TextClause:
    return text("'english'::regconfig")


def _join(*columns: object) -> ColumnElement[str]:
    expr = columns[0]
    for column in columns[1:]:
        expr = expr + " " + column  # type: ignore[operator]
    return expr  # type: ignore[return-value]


def knowledge_vector() -> ColumnElement[str]:
    return func.to_tsvector(literal_regconfig(), _join(col(KnowledgeItem.title), col(KnowledgeItem.content)))


def project_vector() -> ColumnElement[str]:
    return func.to_tsvector(literal_regconfig(), _join(col(Project.name), col(Project.description)))


def decision_vector() -> ColumnElement[str]:
    return func.to_tsvector(
        literal_regconfig(),
        _join(
            col(Decision.title),
            col(Decision.context),
            col(Decision.decision),
            col(Decision.reasoning),
            col(Decision.alternatives),
            col(Decision.expected_outcome),
            col(Decision.actual_outcome),
        ),
    )


def query_terms(raw: str) -> list[str]:
    """Split user input into plain word tokens (no tsquery operators survive)."""
    return [t.lower()[:64] for t in _WORD.findall(raw)][:MAX_TERMS]


def build_tsquery(raw: str, mode: Literal["all", "any"] = "all") -> ColumnElement[str] | None:
    """Prefix-matching tsquery, e.g. "postg index" -> 'postg:* & index:*'.

    Returns None if the text contains no searchable words.
    """
    terms = query_terms(raw)
    if not terms:
        return None
    joiner = " & " if mode == "all" else " | "
    return func.to_tsquery(literal_regconfig(), joiner.join(f"{t}:*" for t in terms))


def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def text_match(vector: ColumnElement[str], tsquery: ColumnElement[str] | None, title_column, raw: str):
    """Full-text match, plus a substring match on the title for odd inputs."""
    like = col(title_column).ilike(f"%{escape_like(raw.strip())}%", escape="\\")
    if tsquery is None:
        return like
    return or_(vector.op("@@")(tsquery), like)


_MD_FENCE = re.compile(r"^\s*(```|~~~).*$", re.MULTILINE)
_MD_LINE_PREFIX = re.compile(r"^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)", re.MULTILINE)
_MD_LINK = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
# Underscores are left alone so identifiers like snake_case_name survive.
_MD_EMPHASIS = re.compile(r"(\*\*|\*|~~|`)(?=\S)(.+?)(?<=\S)\1")


def strip_markdown(text: str) -> str:
    """Turn Markdown into readable plain text for previews (not for rendering)."""
    text = _MD_FENCE.sub("", text)
    text = _MD_LINE_PREFIX.sub("", text)
    text = _MD_LINK.sub(r"\1", text)
    return _MD_EMPHASIS.sub(r"\2", text)


def make_excerpt(body: str, terms: list[str], length: int = 220) -> str:
    """A plain-text snippet centred on the first matching term."""
    flat = " ".join(strip_markdown(body).split())
    if len(flat) <= length:
        return flat
    lowered = flat.lower()
    positions = [p for p in (lowered.find(t) for t in terms) if p >= 0]
    if not positions:
        return flat[:length].rstrip() + "…"
    start = max(0, min(positions) - length // 3)
    end = min(len(flat), start + length)
    snippet = flat[start:end].strip()
    return ("…" if start > 0 else "") + snippet + ("…" if end < len(flat) else "")
