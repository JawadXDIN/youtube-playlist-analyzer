import os
from pydantic_settings import BaseSettings
from typing import List

is_vercel = bool(os.environ.get("VERCEL"))
db_default = "sqlite+aiosqlite:////tmp/playlist_analyzer.db" if is_vercel else "sqlite+aiosqlite:///./playlist_analyzer.db"
sync_db_default = "sqlite:////tmp/playlist_analyzer.db" if is_vercel else "sqlite:///./playlist_analyzer.db"
storage_default = "/tmp/downloads" if is_vercel else "./downloads"


class Settings(BaseSettings):
    DATABASE_URL: str = db_default
    SYNC_DATABASE_URL: str = sync_db_default
    REDIS_URL: str = "redis://localhost:6379"
    STORAGE_PATH: str = storage_default
    MAX_PLAYLIST_SIZE: int = 500
    MAX_CONCURRENT_DOWNLOADS: int = 3
    MAX_FILE_SIZE_MB: int = 2000
    FILE_RETENTION_HOURS: int = 2
    RATE_LIMIT: str = "120/minute"
    CORS_ORIGINS: List[str] = ["*"]
    ALLOWED_HOSTS: List[str] = [
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
