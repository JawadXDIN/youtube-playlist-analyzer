# 🎬 YouTube Playlist Analyzer & Downloader

An open-source, full-stack web application to inspect YouTube playlists, calculate viewing metrics across multiple playback speeds, estimate course completion schedules, and download permitted video, audio (MP3), or thumbnail content.

![Tech Stack](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=FastAPI&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?style=flat&logo=next.js&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat&logo=python&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## ✨ Features

- 📊 **Comprehensive Playlist Analytics:** Total watch time, average video length, total video count, available vs. unavailable breakdown, shortest & longest video highlights.
- 🎯 **Individual Video & Shorts Support:** Paste any individual video (`youtu.be/...`, `watch?v=...`) or short (`/shorts/...`) in addition to playlists.
- ⚡ **Playback Speed Calculator:** View total watch duration at `0.25×`, `0.5×`, `0.75×`, `1.0×`, `1.25×`, `1.5×`, `1.75×`, and `2.0×` with calculated time saved.
- 📅 **Course Completion Planner:** Enter your daily study/watch availability to get exact day estimates required to finish playlists at different playback speeds.
- ⬇️ **Granular Download System:**
  - **Batch Downloads:** Select multiple videos and download as a `.zip` archive.
  - **Single Video Downloads:** Pick quality (`1080p`, `720p`, `480p`, `Best`).
  - **MP3 Audio Extraction:** One-click direct audio extractor.
  - **Thumbnail Downloader:** Save original full-resolution video thumbnails.
- 🚀 **Zero-Dependency Fallback:** Built-in in-process asynchronous task queue when Redis is not running; seamlessly switches to Redis + RQ when available.
- 🔒 **Secure Architecture:** No shell injection, strict domain whitelisting, CORS controls, rate-limiting (slowapi), and automatic cleanup of temporary files older than 2 hours.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, TanStack Query |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2, SQLAlchemy, Uvicorn, SlowAPI |
| **Media Extraction** | yt-dlp, FFmpeg |
| **Async Queue** | Redis + RQ with In-Process Asynchronous Background Thread fallback |
| **Containerization** | Docker, Docker Compose |

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/youtube-playlist-analyzer.git
cd youtube-playlist-analyzer
```

### 2. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server (port 8000)
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup (in a separate terminal)
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server (port 3000)
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🐳 Docker Deployment (One-Command)

```bash
cp .env.example .env
docker compose up --build
```

---


---

## 📖 API Documentation

Interactive OpenAPI / Swagger documentation is available at `/docs` when the backend is running:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/playlist/analyze` | Analyzes a playlist or video URL and returns structured metrics |
| `POST` | `/api/download` | Creates an asynchronous batch download job |
| `POST` | `/api/download/video/{id}` | Creates a download job for an individual video / MP3 |
| `GET` | `/api/download/{job_id}` | Polls real-time progress of a download job |
| `GET` | `/api/download/{job_id}/file` | Streams the downloaded file or zip archive |
| `GET` | `/api/download/thumbnail/{id}` | Proxies the full-resolution thumbnail image |
| `GET` | `/health` | Health check endpoint |

---

## ⚖️ Legal & Disclaimer

This project is intended strictly for educational and legitimate archival purposes. Users are responsible for complying with YouTube's Terms of Service and applicable copyright laws. Only download content you own or have explicit authorization to download.

---

## 📄 License

Distributed under the MIT License.
