from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class WorkerProfile(BaseModel):
    worker_id: str = "ASHA_WORKER_001"
    name: str = "Kavita Sharma"
    email: Optional[str] = "kavita.asha@gov.in"
    role: str = "ASHA Health Worker"
    village: str = "Rampur (Sub-Centre Kalyanpur)"
    preferred_language: str = "en"
    phone: str = "+91 98765 12345"


class UserSignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=100)
    role: Optional[str] = "ASHA Health Worker"
    village: Optional[str] = "Sub-Centre Rampur"
    preferred_language: Optional[str] = "en"
    phone: Optional[str] = "+91 98765 12345"


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class AuthResponse(BaseModel):
    success: bool = True
    message: str = "Authentication successful"
    access_token: str
    token_type: str = "bearer"
    worker: WorkerProfile
