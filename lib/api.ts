function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '' // Relative path for Vercel unified deployment
  }
  return 'http://localhost:8000'
}

export interface Video {
  id: string
  title: string
  duration_seconds: number
  duration_str: string
  position: number
  status: 'available' | 'private' | 'deleted' | 'unavailable'
  thumbnail_url: string
  url: string
}

export interface PlaylistData {
  id: string
  title: string
  uploader: string
  video_count: number
  available_count: number
  unavailable_count: number
  total_seconds: number
  total_duration: string
  average_duration: string
  shortest_video: Video | null
  longest_video: Video | null
  videos: Video[]
}

export interface DownloadJob {
  job_id: string
  status: 'QUEUED' | 'STARTING' | 'DOWNLOADING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
  progress: number
  speed?: string
  eta?: string
  error?: string
  download_url?: string
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getApiBase()
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}

export async function analyzePlaylist(url: string): Promise<PlaylistData> {
  return apiFetch<PlaylistData>('/api/playlist/analyze', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

export async function startDownload(
  videoIds: string[],
  format: string,
  quality: string
): Promise<{ job_id: string; status: string }> {
  return apiFetch('/api/download', {
    method: 'POST',
    body: JSON.stringify({ video_ids: videoIds, format, quality }),
  })
}

export async function startSingleDownload(
  videoId: string,
  format: 'video' | 'audio',
  quality: string = 'best'
): Promise<{ job_id: string; status: string }> {
  return apiFetch(`/api/download/video/${videoId}?format=${format}&quality=${quality}`, {
    method: 'POST',
  })
}

export function getThumbnailDownloadUrl(videoId: string): string {
  const base = getApiBase()
  return `${base}/api/download/thumbnail/${videoId}`
}

export async function getJobStatus(jobId: string): Promise<DownloadJob> {
  return apiFetch<DownloadJob>(`/api/download/${jobId}`)
}
