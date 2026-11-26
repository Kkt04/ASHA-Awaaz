import os
import secrets
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ASHA Awaaz"
    API_V1_PREFIX: str = "/api/v1"
    
    # AI - Groq configuration (Backend only, never exposed to frontend)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "asha_awaaz"
    
    # Auth - JWT secret loaded from environment; generates dynamic secure secret if omitted
    JWT_SECRET: str = os.getenv("JWT_SECRET") or secrets.token_hex(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Clinical Danger Sign Thresholds (Configurable Decision Support)
    DANGER_BP_SYSTOLIC: int = 140
    DANGER_BP_DIASTOLIC: int = 90
    DANGER_NEWBORN_TEMP_F: float = 100.4
    
    # Emergency Contacts
    ANM_DEFAULT_PHONE: str = "+91 98765 43210"
    PHC_HELPLINE: str = "108"
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
