from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


def seconds_to_human(seconds: int) -> str:
    """Convert seconds to human-readable string like '8h 37m 21s'."""
    if seconds <= 0:
        return "0s"
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    parts = []
    if h:
        parts.append(f"{h}h")
    if m:
        parts.append(f"{m}m")
    if s or not parts:
        parts.append(f"{s}s")
    return " ".join(parts)


def seconds_to_timestamp(seconds: int) -> str:
    """Convert seconds to HH:MM:SS or MM:SS format."""
    if seconds <= 0:
        return "0:00"
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


# ── Requests ──────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    url: str


class DownloadRequest(BaseModel):
    video_ids: List[str]
    format: str = "best"
    quality: str = "best"


# ── Responses ─────────────────────────────────────────────

class VideoSchema(BaseModel):
    id: str
    title: str
    duration_seconds: int
    duration_str: str
    position: int
    status: str
    thumbnail_url: str
    url: str

    model_config = {"from_attributes": True}


class PlaylistResponse(BaseModel):
    id: str
    title: str
    uploader: str
    video_count: int
    available_count: int
    unavailable_count: int
    total_seconds: int
    total_duration: str
    average_duration: str
    shortest_video: Optional[VideoSchema]
    longest_video: Optional[VideoSchema]
    videos: List[VideoSchema]

    model_config = {"from_attributes": True}


class DownloadJobResponse(BaseModel):
    job_id: str
    status: str
    progress: float = 0.0
    speed: Optional[str] = None
    eta: Optional[str] = None
    error: Optional[str] = None
    download_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ErrorResponse(BaseModel):
    detail: str
