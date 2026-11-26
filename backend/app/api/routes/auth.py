from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Worker Authentication"])


class WorkerProfile(BaseModel):
    worker_id: str = "ASHA_WORKER_001"
    name: str = "Kavita Sharma"
    role: str = "ASHA Health Worker"
    village: str = "Rampur (Sub-Centre Kalyanpur)"
    preferred_language: str = "hi"
    phone: str = "+91 98765 12345"


@router.get("/worker/me", response_model=WorkerProfile)
async def get_worker_profile():
    return WorkerProfile()


@router.post("/auth/login")
async def worker_login():
    return {
        "access_token": "asha-demo-jwt-token",
        "token_type": "bearer",
        "worker": WorkerProfile().model_dump()
    }
