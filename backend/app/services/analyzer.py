import asyncio
from urllib.parse import urlparse, parse_qs
import yt_dlp

from app.config import settings

COMMON_YDL_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "ignoreerrors": True,
    "no_check_certificates": True,
    "nocheckcertificate": True,
    "cachedir": False,  # CRITICAL: Prevents read-only filesystem crash in Vercel serverless
    "noplaylist": False,
    "http_headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    },
}


def _parse_youtube_url(url: str) -> dict:
    try:
        parsed = urlparse(url.strip())
        host = parsed.netloc.lstrip("www.")
        qs = parse_qs(parsed.query)

        if host == "youtu.be":
            vid = parsed.path.lstrip("/").split("?")[0]
            return {"type": "video", "video_id": vid, "playlist_id": None}

        if host in ("youtube.com", "m.youtube.com"):
            if "list" in qs and qs["list"][0]:
                return {"type": "playlist", "playlist_id": qs["list"][0], "video_id": None}
            if "v" in qs and qs["v"][0]:
                return {"type": "video", "video_id": qs["v"][0], "playlist_id": None}
            if "/shorts/" in parsed.path:
                vid = parsed.path.split("/shorts/")[1].split("/")[0]
                return {"type": "video", "video_id": vid, "playlist_id": None}

        return {"type": "unknown", "video_id": None, "playlist_id": None}
    except Exception:
        return {"type": "unknown", "video_id": None, "playlist_id": None}


def validate_playlist_url(url: str) -> bool:
    info = _parse_youtube_url(url)
    return info["type"] in ("playlist", "video")


def _extract_single_video(url: str) -> dict:
    ydl_opts = dict(COMMON_YDL_OPTS)
    ydl_opts["noplaylist"] = True

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if not info:
        raise ValueError("Could not retrieve video. Make sure the URL is correct and public.")

    vid_id = info.get("id", "")
    title = info.get("title", "YouTube Video")
    duration = int(info.get("duration") or 0)
    thumbnails = info.get("thumbnails") or []
    thumbnail_url = thumbnails[-1].get("url", "") if thumbnails else ""
    if not thumbnail_url and vid_id:
        thumbnail_url = f"https://i.ytimg.com/vi/{vid_id}/mqdefault.jpg"
    uploader = info.get("uploader") or info.get("channel") or ""

    video = {
        "id": vid_id,
        "title": title,
        "duration_seconds": duration,
        "position": 1,
        "status": "available",
        "thumbnail_url": thumbnail_url,
        "url": f"https://www.youtube.com/watch?v={vid_id}",
    }

    return {
        "id": f"single_{vid_id}",
        "url": url,
        "title": title,
        "uploader": uploader,
        "videos": [video],
    }


def _extract_playlist_sync(url: str) -> dict:
    url_info = _parse_youtube_url(url)

    if url_info["type"] == "video":
        return _extract_single_video(url)

    ydl_opts = dict(COMMON_YDL_OPTS)
    ydl_opts.update({
        "extract_flat": "in_playlist",
        "playlistend": settings.MAX_PLAYLIST_SIZE,
    })

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if info is None:
        raise ValueError("Could not retrieve playlist. Make sure the URL is correct and public.")

    entries = info.get("entries") or []
    videos = []

    for idx, entry in enumerate(entries):
        if entry is None:
            videos.append({
                "id": f"unavailable_{idx}",
                "title": "[Unavailable]",
                "duration_seconds": 0,
                "position": idx + 1,
                "status": "unavailable",
                "thumbnail_url": "",
                "url": "",
            })
            continue

        vid_id = entry.get("id") or f"unknown_{idx}"
        title = entry.get("title") or ""
        duration = int(entry.get("duration") or 0)
        thumbnails = entry.get("thumbnails") or []
        thumbnail_url = ""
        if thumbnails:
            thumbnail_url = thumbnails[-1].get("url", "")
        if not thumbnail_url and vid_id and not vid_id.startswith(("unavailable_", "unknown_")):
            thumbnail_url = f"https://i.ytimg.com/vi/{vid_id}/mqdefault.jpg"

        if not title or title in ("[Private video]", "[Deleted video]"):
            status = "private" if "private" in title.lower() else "deleted"
        else:
            status = "available"

        videos.append({
            "id": vid_id,
            "title": title if title else "[Unavailable]",
            "duration_seconds": duration,
            "position": idx + 1,
            "status": status,
            "thumbnail_url": thumbnail_url,
            "url": f"https://www.youtube.com/watch?v={vid_id}" if vid_id and not vid_id.startswith(("unavailable_", "unknown_")) else "",
        })

    playlist_id = info.get("id") or ""
    title = info.get("title") or "Unknown Playlist"
    uploader = info.get("uploader") or info.get("channel") or ""

    return {
        "id": playlist_id,
        "url": url,
        "title": title,
        "uploader": uploader,
        "videos": videos,
    }


async def analyze_playlist(url: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _extract_playlist_sync, url)
