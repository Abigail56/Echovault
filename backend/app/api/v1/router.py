from fastapi import APIRouter, Depends

from app.api.deps import require_csrf
from app.api.v1.endpoints import assistant, auth, decisions, knowledge, projects, search

api_router = APIRouter()

# Auth routes apply CSRF checks per route (login/register have no session yet).
api_router.include_router(auth.router)

# Every other route requires a session and a CSRF header on writes.
_protected = [Depends(require_csrf)]
api_router.include_router(knowledge.router, dependencies=_protected)
api_router.include_router(projects.router, dependencies=_protected)
api_router.include_router(decisions.router, dependencies=_protected)
api_router.include_router(search.router, dependencies=_protected)
api_router.include_router(assistant.router, dependencies=_protected)
