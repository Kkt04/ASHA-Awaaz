import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.mongodb import db_manager
from app.api.routes import health, extraction, risk, visits, patients, sync, auth

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("asha_awaaz")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to DB or initialize in-memory store
    logger.info("Initializing ASHA Awaaz backend service...")
    await db_manager.connect_db()
    yield
    # Shutdown: Close DB connection
    logger.info("Shutting down ASHA Awaaz backend service...")
    await db_manager.close_db()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Voice-First Healthcare Register for ASHA Workers in Rural India (Build for Bharat Prototype)",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend PWA across all dev and production preview URLs
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status_code": exc.status_code,
            "detail": exc.detail,
            "message": str(exc.detail)
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_msg = errors[0].get("msg", "Invalid request parameters") if errors else "Validation failed"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "status_code": 422,
            "detail": first_msg,
            "message": first_msg,
            "errors": [
                {"loc": list(err.get("loc", [])), "msg": err.get("msg", ""), "type": err.get("type", "")}
                for err in errors
            ]
        }
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "status_code": 500,
            "detail": "Internal server error. Please try again shortly.",
            "message": "The server encountered an unexpected error. Please try again."
        }
    )

# Root health endpoint
app.include_router(health.router)

# API v1 routes
api_prefix = settings.API_V1_PREFIX
app.include_router(health.router, prefix=api_prefix)
app.include_router(extraction.router, prefix=api_prefix)
app.include_router(risk.router, prefix=api_prefix)
app.include_router(visits.router, prefix=api_prefix)
app.include_router(patients.router, prefix=api_prefix)
app.include_router(sync.router, prefix=api_prefix)
app.include_router(auth.router, prefix=api_prefix)


@app.get("/")
async def root():
    return {
        "app": "ASHA Awaaz",
        "description": "Voice-First Healthcare Register for ASHA Workers",
        "docs_url": "/docs",
        "health_url": "/health"
    }
