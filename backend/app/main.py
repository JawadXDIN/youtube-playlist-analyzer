import asyncio
import os
import shutil
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.database import create_all_tables
from app.routers import playlist, download


limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT])


async def cleanup_old_files():
    """Background task: delete downloads older than FILE_RETENTION_HOURS."""
    while True:
        await asyncio.sleep(900)  # run every 15 minutes
        try:
            storage = settings.STORAGE_PATH
            cutoff = datetime.utcnow() - timedelta(hours=settings.FILE_RETENTION_HOURS)
            if not os.path.exists(storage):
                continue
            for entry in os.scandir(storage):
                try:
                    mtime = datetime.utcfromtimestamp(entry.stat().st_mtime)
                    if mtime < cutoff:
                        if entry.is_dir():
                            shutil.rmtree(entry.path, ignore_errors=True)
                        else:
                            os.remove(entry.path)
                except Exception:
                    pass
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await create_all_tables()
        os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    except Exception:
        pass

    cleanup_task = None
    if not os.environ.get("VERCEL"):
        cleanup_task = asyncio.create_task(cleanup_old_files())

    yield

    # Shutdown
    if cleanup_task:
        cleanup_task.cancel()


app = FastAPI(
    title="YouTube Playlist Analyzer",
    version="1.0.0",
    description="Analyze YouTube playlists and download permitted content.",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Permissive CORS for seamless cloud and local communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers - mounted with and without /api prefix to handle all proxy configurations
app.include_router(playlist.router, prefix="/api/playlist", tags=["playlist"])
app.include_router(playlist.router, prefix="/playlist", tags=["playlist"])
app.include_router(download.router, prefix="/api/download", tags=["download"])
app.include_router(download.router, prefix="/download", tags=["download"])


@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok"}
