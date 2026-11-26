import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
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

# Enable CORS for frontend PWA
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
