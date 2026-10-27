from typing import Annotated

from fastapi import APIRouter, Depends

from app.ai.providers import AIProvider, get_ai_provider
from app.api.deps import Auth, DbSession, OwnerId
from app.core.config import settings
from app.core.rate_limit import limiter
from app.schemas.assistant import AssistantAnswer, AssistantQuestion, AssistantStatus
from app.services import assistant_service

router = APIRouter(prefix="/assistant", tags=["assistant"])

Provider = Annotated[AIProvider | None, Depends(get_ai_provider)]


@router.get("/status", response_model=AssistantStatus)
def assistant_status(_: Auth, provider: Provider) -> AssistantStatus:
    if provider is None:
        return AssistantStatus(configured=False, provider=None, model=None)
    return AssistantStatus(configured=True, provider=provider.name, model=provider.model)


@router.post("/ask", response_model=AssistantAnswer)
def ask(body: AssistantQuestion, db: DbSession, owner_id: OwnerId, provider: Provider) -> AssistantAnswer:
    # Provider calls cost money and time; cap them per user.
    limiter.hit(f"assistant:{owner_id}", limit=20, window_seconds=300)
    return assistant_service.answer_question(
        db, owner_id, provider, body.question, body.project_id, settings.AI_MAX_SOURCES
    )
