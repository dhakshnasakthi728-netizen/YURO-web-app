"""Application configuration."""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "HUMANLY AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production"
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "http://localhost:5174"]
    
    # Database
    DATABASE_URL: str = "sqlite:///./humanlyai.db"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_FILE_TYPES: List[str] = ["pdf", "docx", "txt"]
    UPLOAD_DIR: str = "./uploads"
    TEMP_DIR: str = "./temp"
    
    # AI/ML Models
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    
    # Ollama (local)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"
    OLLAMA_TIMEOUT: int = 300
    
    # Detection
    DETECTION_MODEL: str = "roberta-base-openai-detector"
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.5
    ENABLE_DETECTION_EVALUATION: bool = False
    
    # Humanization
    HUMANIZATION_PROVIDER: str = "ollama"
    HUMANIZATION_TEMPERATURE: float = 0.7
    HUMANIZATION_MAX_TOKENS: int = 4000
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600
    
    # Privacy
    LOG_FULL_DOCUMENTS: bool = False
    AUTO_DELETE_TEMP_FILES: bool = True
    TEMP_FILE_RETENTION_HOURS: int = 24
    
    # Security
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if v is None:
            return ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]
        if isinstance(v, str):
            if not v.strip():
                return ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]
    
    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, v):
        if v is None:
            return ["localhost", "127.0.0.1"]
        if isinstance(v, str):
            if not v.strip():
                return ["localhost", "127.0.0.1"]
            return [host.strip() for host in v.split(",") if host.strip()]
        if isinstance(v, list):
            return v
        return ["localhost", "127.0.0.1"]
    
    @field_validator("ALLOWED_FILE_TYPES", mode="before")
    @classmethod
    def parse_allowed_file_types(cls, v):
        if isinstance(v, str):
            return [ft.strip() for ft in v.split(",") if ft.strip()]
        if isinstance(v, list):
            return v
        return ["pdf", "docx", "txt"]
    
    class Config:
        env_file = (".env", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))
        case_sensitive = True
        extra = "ignore"


settings = Settings()
