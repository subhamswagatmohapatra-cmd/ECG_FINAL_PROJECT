from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "CardioPulse AI - Clinical Decision Support Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cardiopulse-clinical-security-key-production-ready-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # SQLite default with PostgreSQL URI support
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./cardiopulse.db")
    
    # AI / LLM Configuration
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    AI_FALLBACK_MODE: bool = True
    
    # Emergency Contact Hotline Defaults (e.g., India: 112 / 102 / 108, US: 911)
    EMERGENCY_AMBULANCE_NUMBER: str = "112"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
