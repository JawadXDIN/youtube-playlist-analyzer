import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, create_all_tables
from app.models import Playlist, Video
from app.schemas import AnalyzeRequest, PlaylistResponse, VideoSchema, seconds_to_human, seconds_to_timestamp
from app.services.analyzer import analyze_playlist, validate_playlist_url

router = APIRouter()


def _video_to_schema(v: dict | Video) -> VideoSchema:
    if isinstance(v, dict):
        duration = v.get("duration_seconds", 0)
        return VideoSchema(
            id=v.get("id", ""),
            title=v.get("title", ""),
            duration_seconds=duration,
            duration_str=seconds_to_timestamp(duration),
            position=v.get("position", 1),
            status=v.get("status", "available"),
            thumbnail_url=v.get("thumbnail_url", ""),
            url=v.get("url", ""),
        )
    return VideoSchema(
        id=v.id,
        title=v.title,
        duration_seconds=v.duration_seconds,
        duration_str=seconds_to_timestamp(v.duration_seconds),
        position=v.position,
        status=v.status,
        thumbnail_url=v.thumbnail_url,
        url=v.url,
    )


def _build_from_data(data: dict) -> PlaylistResponse:
    videos_raw = data.get("videos", [])
    available = [v for v in videos_raw if v.get("status") == "available"]
    total_secs = sum(v.get("duration_seconds", 0) for v in available)
    avg_secs = total_secs // len(available) if available else 0
    shortest = min(available, key=lambda v: v.get("duration_seconds", 0), default=None)
    longest = max(available, key=lambda v: v.get("duration_seconds", 0), default=None)

    return PlaylistResponse(
        id=data.get("id") or str(uuid.uuid4()),
        title=data.get("title", "Unknown Playlist"),
        uploader=data.get("uploader", ""),
        video_count=len(videos_raw),
        available_count=len(available),
        unavailable_count=len(videos_raw) - len(available),
        total_seconds=total_secs,
        total_duration=seconds_to_human(total_secs),
        average_duration=seconds_to_human(avg_secs),
        shortest_video=_video_to_schema(shortest) if shortest else None,
        longest_video=_video_to_schema(longest) if longest else None,
        videos=[_video_to_schema(v) for v in sorted(videos_raw, key=lambda v: v.get("position", 1))],
    )


@router.post("/analyze", response_model=PlaylistResponse)
async def analyze(request: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    url = request.url.strip()

    if not validate_playlist_url(url):
        raise HTTPException(
            status_code=422,
            detail="Invalid YouTube URL. Please provide a playlist URL (with list=) or a video URL (youtu.be/... or watch?v=...).",
        )

    # Attempt cache lookup (fail-safe)
    try:
        await create_all_tables()
        cache_cutoff = datetime.utcnow() - timedelta(minutes=30)
        result = await db.execute(
            select(Playlist).where(
                Playlist.url == url,
                Playlist.created_at >= cache_cutoff,
            )
        )
        cached = result.scalar_one_or_none()
        if cached:
            vids_result = await db.execute(select(Video).where(Video.playlist_id == cached.id))
            videos = vids_result.scalars().all()
            if videos:
                available = [v for v in videos if v.status == "available"]
                total_secs = sum(v.duration_seconds for v in available)
                avg_secs = total_secs // len(available) if available else 0
                shortest = min(available, key=lambda v: v.duration_seconds, default=None)
                longest = max(available, key=lambda v: v.duration_seconds, default=None)
                return PlaylistResponse(
                    id=cached.id,
                    title=cached.title,
                    uploader=cached.uploader,
                    video_count=len(videos),
                    available_count=len(available),
                    unavailable_count=len(videos) - len(available),
                    total_seconds=total_secs,
                    total_duration=seconds_to_human(total_secs),
                    average_duration=seconds_to_human(avg_secs),
                    shortest_video=_video_to_schema(shortest) if shortest else None,
                    longest_video=_video_to_schema(longest) if longest else None,
                    videos=[_video_to_schema(v) for v in sorted(videos, key=lambda v: v.position)],
                )
    except Exception:
        pass  # Proceed directly to live extraction if DB fails

    # Fresh extraction
    try:
        data = await analyze_playlist(url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Extraction error: {str(e)}",
        )

    # Attempt cache persistence (fail-safe)
    try:
        playlist_id = data["id"] or str(uuid.uuid4())
        available_vids = [v for v in data["videos"] if v["status"] == "available"]
        total_secs = sum(v["duration_seconds"] for v in available_vids)

        playlist = Playlist(
            id=playlist_id,
            url=url,
            title=data["title"],
            uploader=data["uploader"],
            video_count=len(data["videos"]),
            available_count=len(available_vids),
            unavailable_count=len(data["videos"]) - len(available_vids),
            total_seconds=total_secs,
            created_at=datetime.utcnow(),
        )
        db.add(playlist)

        for v in data["videos"]:
            vid = Video(
                id=v["id"],
                playlist_id=playlist_id,
                title=v["title"],
                duration_seconds=v["duration_seconds"],
                position=v["position"],
                status=v["status"],
                thumbnail_url=v["thumbnail_url"],
                url=v["url"],
            )
            db.add(vid)

        await db.commit()
    except Exception:
        pass  # DB failure should never prevent returning data to user

    return _build_from_data(data)
