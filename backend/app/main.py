import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlmodel import Session

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine
from app.services.errors import ServiceError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("echovault")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    # Interactive docs are handy locally but not exposed in production.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


@app.middleware("http")
async def limit_body_and_add_headers(request: Request, call_next):
    length = request.headers.get("content-length")
    if length is not None:
        try:
            # File uploads get a bigger allowance; the upload code enforces the exact limit.
            is_upload = request.method == "POST" and request.url.path.endswith("/attachments")
            limit = settings.MAX_UPLOAD_BYTES + 100_000 if is_upload else settings.MAX_REQUEST_BYTES
            too_large = int(length) > limit
        except ValueError:
            return JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)
        if too_large:
            return JSONResponse({"detail": "Request body too large"}, status_code=413)
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.exception_handler(ServiceError)
async def service_error_handler(_: Request, exc: ServiceError) -> JSONResponse:
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Full details go to the server log; the client gets a generic message.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        {"detail": "Something went wrong on our side. Please try again."},
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"name": settings.APP_NAME, "docs": "/docs", "health": "/health"}


@app.get("/health", tags=["health"])
def health() -> JSONResponse:
    try:
        with Session(engine) as session:
            session.exec(text("SELECT 1"))  # type: ignore[call-overload]
        return JSONResponse({"status": "ok", "database": "ok"})
    except Exception:
        logger.exception("Health check database failure")
        return JSONResponse({"status": "degraded", "database": "unavailable"}, status_code=503)
