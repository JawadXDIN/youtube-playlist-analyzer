import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(String, primary_key=True)
    url = Column(String, nullable=False)
    title = Column(String, default="")
    uploader = Column(String, default="")
    video_count = Column(Integer, default=0)
    available_count = Column(Integer, default=0)
    unavailable_count = Column(Integer, default=0)
    total_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    videos = relationship("Video", back_populates="playlist", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True)
    playlist_id = Column(String, ForeignKey("playlists.id"))
    title = Column(String, default="")
    duration_seconds = Column(Integer, default=0)
    position = Column(Integer, default=0)
    status = Column(String, default="available")  # available | private | deleted | unavailable
    thumbnail_url = Column(String, default="")
    url = Column(String, default="")

    playlist = relationship("Playlist", back_populates="videos")


class DownloadJob(Base):
    __tablename__ = "download_jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    video_ids = Column(JSON, default=list)
    format = Column(String, default="best")
    quality = Column(String, default="best")
    status = Column(String, default="QUEUED")
    progress = Column(Float, default=0.0)
    speed = Column(String, default="")
    eta = Column(String, default="")
    file_path = Column(String, default="")
    error = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
