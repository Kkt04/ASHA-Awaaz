from fastapi import APIRouter
from app.config import settings
from app.database.mongodb import db_manager

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database_connected": db_manager.is_connected_to_mongo,
        "database_mode": "mongodb" if db_manager.is_connected_to_mongo else "in_memory_offline_ready",
        "groq_configured": bool(settings.GROQ_API_KEY)
    }
