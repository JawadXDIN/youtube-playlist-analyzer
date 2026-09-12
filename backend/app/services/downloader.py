import os
import json
import zipfile
import yt_dlp
from typing import Optional, Callable

from app.config import settings

# In-memory progress cache for fallback when Redis is not running
IN_MEMORY_PROGRESS = {}


def _build_format_string(format: str, quality: str) -> str:
    """Build yt-dlp format string from format/quality selectors."""
    if format == "audio":
        return "bestaudio/best"

    quality_map = {
        "best": "bestvideo+bestaudio/best",
        "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
        "720p": "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "480p": "bestvideo[height<=480]+bestaudio/best[height<=480]",
    }
    return quality_map.get(quality, "bestvideo+bestaudio/best")


def download_videos(
    job_id: str,
    video_ids: list,
    format: str,
    quality: str,
    storage_path: str,
    redis_url: Optional[str] = None,
    on_progress: Optional[Callable[[float, str, str], None]] = None,
) -> str:
    """
    Synchronous download function.
    Can be called by RQ worker or directly in a background thread.
    Returns path to downloaded file (or zip if multiple).
    """
    output_dir = os.path.join(storage_path, job_id)
    os.makedirs(output_dir, exist_ok=True)

    redis_client = None
    if redis_url:
        try:
            import redis as redis_lib
            client = redis_lib.from_url(redis_url, socket_timeout=1.0)
            client.ping()
            redis_client = client
        except Exception:
            redis_client = None

    def progress_hook(d):
        if d.get("status") == "downloading":
            try:
                downloaded = d.get("downloaded_bytes", 0)
                total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
                pct = (downloaded / total * 100) if total > 0 else 0
                speed = d.get("_speed_str", "").strip()
                eta = d.get("_eta_str", "").strip()

                progress_data = {
                    "progress": round(pct, 1),
                    "speed": speed,
                    "eta": eta,
                }
                IN_MEMORY_PROGRESS[job_id] = progress_data

                if redis_client:
                    try:
                        redis_client.set(
                            f"job:{job_id}:progress",
                            json.dumps(progress_data),
                            ex=3600,
                        )
                    except Exception:
                        pass

                if on_progress:
                    try:
                        on_progress(round(pct, 1), speed, eta)
                    except Exception:
                        pass
            except Exception:
                pass

    fmt_string = _build_format_string(format, quality)
    postprocessors = []
    if format == "audio":
        postprocessors.append({
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        })

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "format": fmt_string,
        "outtmpl": os.path.join(output_dir, "%(title)s.%(ext)s"),
        "progress_hooks": [progress_hook],
        "postprocessors": postprocessors,
        "ignoreerrors": True,
        "noplaylist": True,
        "cachedir": False,
        "no_check_certificates": True,
    }

    urls = [f"https://www.youtube.com/watch?v={vid_id}" for vid_id in video_ids]

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download(urls)

    # Collect downloaded files
    downloaded_files = []
    for fname in os.listdir(output_dir):
        fpath = os.path.join(output_dir, fname)
        if os.path.isfile(fpath):
            downloaded_files.append(fpath)

    if not downloaded_files:
        raise RuntimeError("No files were downloaded. The video(s) may be unavailable or restricted.")

    if len(downloaded_files) == 1:
        return downloaded_files[0]

    # Zip multiple files
    zip_path = os.path.join(storage_path, f"{job_id}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fpath in downloaded_files:
            zf.write(fpath, os.path.basename(fpath))
    return zip_path
