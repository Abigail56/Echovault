"""Importing this package registers every table with SQLModel.metadata."""

from app.models.decision import Decision, DecisionStatus
from app.models.knowledge import KnowledgeItem, KnowledgeLink, KnowledgeTag, Tag
from app.models.project import Project, ProjectStatus
from app.models.user import PasswordResetToken, User, UserSession

__all__ = [
    "Decision",
    "DecisionStatus",
    "KnowledgeItem",
    "KnowledgeLink",
    "KnowledgeTag",
    "PasswordResetToken",
    "Project",
    "ProjectStatus",
    "Tag",
    "User",
    "UserSession",
]
