import json
import os
import threading
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.services.downloader import download_videos, IN_MEMORY_PROGRESS


def _get_sync_session():
    engine = create_engine(settings.SYNC_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    return Session()


def process_download(job_id: str, video_ids: list, format: str, quality: str):
    """
    Background download task.
    Can be called by RQ worker or run directly in a background thread.
    Updates DownloadJob status in the database throughout the download.
    """
    from app.models import DownloadJob  # import here to avoid circular imports

    session = _get_sync_session()

    def _update_job(**kwargs):
        try:
            session.query(DownloadJob).filter(DownloadJob.id == job_id).update(kwargs)
            session.commit()
        except Exception:
            session.rollback()

    try:
        _update_job(status="DOWNLOADING", progress=0.0)

        def on_progress(pct: float, speed: str, eta: str):
            _update_job(
                status="DOWNLOADING",
                progress=pct,
                speed=speed,
                eta=eta,
            )

        file_path = download_videos(
            job_id=job_id,
            video_ids=video_ids,
            format=format,
            quality=quality,
            storage_path=settings.STORAGE_PATH,
            redis_url=settings.REDIS_URL,
            on_progress=on_progress,
        )

        _update_job(
            status="COMPLETED",
            progress=100.0,
            file_path=file_path,
            completed_at=datetime.utcnow(),
        )

    except Exception as e:
        _update_job(
            status="ERROR",
            error=str(e),
        )
    finally:
        session.close()


def enqueue_or_run_task(job_id: str, video_ids: list, format: str, quality: str):
    """
    Tries to enqueue in Redis / RQ if available.
    If Redis is not available, executes immediately in a background daemon thread.
    """
    try:
        import redis as redis_lib
        from rq import Queue

        r = redis_lib.from_url(settings.REDIS_URL, socket_timeout=1.0)
        r.ping()
        q = Queue("downloads", connection=r)
        q.enqueue(
            "app.workers.tasks.process_download",
            job_id,
            video_ids,
            format,
            quality,
            job_timeout=3600,
        )
    except Exception:
        # Fallback to in-process background thread
        thread = threading.Thread(
            target=process_download,
            args=(job_id, video_ids, format, quality),
            daemon=True,
        )
        thread.start()
