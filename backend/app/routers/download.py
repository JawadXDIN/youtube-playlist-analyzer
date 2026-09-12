import os
import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models import DownloadJob, Video
from app.schemas import DownloadRequest, DownloadJobResponse
from app.workers.tasks import enqueue_or_run_task
from app.services.downloader import IN_MEMORY_PROGRESS

router = APIRouter()


def _job_to_response(job: DownloadJob, request_base: str = "") -> DownloadJobResponse:
    download_url = None
    if job.status == "COMPLETED" and job.file_path:
        download_url = f"{request_base}/api/download/{job.id}/file"

    progress = job.progress
    speed = job.speed or None
    eta = job.eta or None

    # Check live in-memory progress if active
    if job.id in IN_MEMORY_PROGRESS and job.status in ("DOWNLOADING", "STARTING", "QUEUED"):
        mem = IN_MEMORY_PROGRESS[job.id]
        progress = mem.get("progress", progress)
        speed = mem.get("speed") or speed
        eta = mem.get("eta") or eta

    return DownloadJobResponse(
        job_id=job.id,
        status=job.status,
        progress=progress,
        speed=speed,
        eta=eta,
        error=job.error or None,
        download_url=download_url,
    )


@router.post("", response_model=DownloadJobResponse)
async def start_download(request: DownloadRequest, db: AsyncSession = Depends(get_db)):
    if not request.video_ids:
        raise HTTPException(status_code=422, detail="No video IDs provided.")

    if len(request.video_ids) > 50:
        raise HTTPException(status_code=422, detail="Maximum 50 videos per download job.")

    # Validate video IDs exist
    result = await db.execute(
        select(Video).where(Video.id.in_(request.video_ids), Video.status == "available")
    )
    valid_videos = result.scalars().all()
    valid_ids = [v.id for v in valid_videos]

    if not valid_ids:
        raise HTTPException(
            status_code=422,
            detail="None of the selected videos are available for download.",
        )

    job_id = str(uuid.uuid4())
    job = DownloadJob(
        id=job_id,
        video_ids=valid_ids,
        format=request.format,
        quality=request.quality,
        status="QUEUED",
        created_at=datetime.utcnow(),
    )
    db.add(job)
    await db.commit()

    # Launch task asynchronously (Redis queue if available, background thread fallback)
    enqueue_or_run_task(
        job_id=job_id,
        video_ids=valid_ids,
        format=request.format,
        quality=request.quality,
    )

    return DownloadJobResponse(job_id=job_id, status="QUEUED")


@router.get("/{job_id}", response_model=DownloadJobResponse)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DownloadJob).where(DownloadJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return _job_to_response(job, "")


@router.get("/{job_id}/file")
async def download_file(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DownloadJob).where(DownloadJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Download not completed yet.")
    if not job.file_path or not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="File not found. It may have been cleaned up.")

    filename = os.path.basename(job.file_path)
    return FileResponse(
        path=job.file_path,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.get("/thumbnail/{video_id}")
async def proxy_thumbnail(video_id: str, db: AsyncSession = Depends(get_db)):
    """Proxy the YouTube thumbnail so the browser can download it cross-origin."""
    result = await db.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()

    thumbnail_url = (video.thumbnail_url if video and video.thumbnail_url
                     else f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(thumbnail_url)
            if resp.status_code != 200:
                thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
                resp = await client.get(thumbnail_url)
            content_type = resp.headers.get("content-type", "image/jpeg")

        async def iter_content():
            async with httpx.AsyncClient(timeout=10) as c:
                async with c.stream("GET", thumbnail_url) as r:
                    async for chunk in r.aiter_bytes(chunk_size=8192):
                        yield chunk

        title = video.title.replace("/", "-")[:60] if video and video.title else video_id
        return StreamingResponse(
            iter_content(),
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{title}.jpg"'},
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Could not fetch thumbnail.")


@router.post("/video/{video_id}", response_model=DownloadJobResponse)
async def download_single_video(
    video_id: str,
    format: str = "video",
    quality: str = "best",
    db: AsyncSession = Depends(get_db),
):
    """Convenience endpoint — start a download job for a single video."""
    result = await db.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")
    if video.status != "available":
        raise HTTPException(status_code=422, detail="Video is not available for download.")

    job_id = str(uuid.uuid4())
    job = DownloadJob(
        id=job_id,
        video_ids=[video_id],
        format=format,
        quality=quality,
        status="QUEUED",
        created_at=datetime.utcnow(),
    )
    db.add(job)
    await db.commit()

    # Launch task (Redis or in-process background thread)
    enqueue_or_run_task(
        job_id=job_id,
        video_ids=[video_id],
        format=format,
        quality=quality,
    )

    return DownloadJobResponse(job_id=job_id, status="QUEUED")
