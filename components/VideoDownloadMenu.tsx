'use client'

import { useState } from 'react'
import { Download, Music, Image as ImageIcon, Video, ChevronDown, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { startSingleDownload, getThumbnailDownloadUrl, getJobStatus } from '../lib/api'
import type { DownloadJob } from '../lib/api'
import ProgressBar from './ProgressBar'

interface Props {
  videoId: string
  videoTitle: string
}

type ActionType = 'video' | 'audio' | 'thumbnail'

interface ActiveJob {
  jobId: string
  type: ActionType
  status: DownloadJob['status']
  progress: number
  downloadUrl?: string
  error?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const QUALITY_OPTIONS = [
  { value: 'best', label: 'Best' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
]

export default function VideoDownloadMenu({ videoId, videoTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [quality, setQuality] = useState('best')
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null)
  const [loading, setLoading] = useState<ActionType | null>(null)

  async function pollJob(jobId: string, type: ActionType) {
    const poll = async () => {
      try {
        const job = await getJobStatus(jobId)
        setActiveJob({
          jobId,
          type,
          status: job.status,
          progress: job.progress,
          downloadUrl: job.download_url,
          error: job.error,
        })
        if (['QUEUED', 'STARTING', 'DOWNLOADING', 'PROCESSING'].includes(job.status)) {
          setTimeout(poll, 1500)
        }
      } catch {
        setActiveJob((prev) => prev ? { ...prev, status: 'ERROR', error: 'Failed to get status.' } : null)
      }
    }
    setTimeout(poll, 1000)
  }

  async function handleDownload(type: ActionType) {
    setLoading(type)
    try {
      if (type === 'thumbnail') {
        // Direct browser download via anchor
        const a = document.createElement('a')
        a.href = getThumbnailDownloadUrl(videoId)
        a.download = `${videoTitle.slice(0, 60)}.jpg`
        a.click()
        setOpen(false)
        return
      }

      const res = await startSingleDownload(videoId, type, quality)
      setActiveJob({ jobId: res.job_id, type, status: 'QUEUED', progress: 0 })
      setOpen(false)
      pollJob(res.job_id, type)
    } catch (err) {
      setActiveJob({
        jobId: '',
        type,
        status: 'ERROR',
        progress: 0,
        error: err instanceof Error ? err.message : 'Failed to start download.',
      })
    } finally {
      setLoading(null)
    }
  }

  const isActive = activeJob && ['QUEUED', 'STARTING', 'DOWNLOADING', 'PROCESSING'].includes(activeJob.status)

  return (
    <div className="relative">
      {/* Active job mini-display */}
      {activeJob && (
        <div className="mt-2 rounded-lg border border-yt-border bg-yt-dark p-2.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-gray-400">
              {activeJob.type === 'video' && <Video className="w-3 h-3" />}
              {activeJob.type === 'audio' && <Music className="w-3 h-3" />}
              {activeJob.type === 'thumbnail' && <ImageIcon className="w-3 h-3" />}
              <span className="capitalize">{activeJob.type}</span>
            </span>
            <span className={`font-medium ${
              activeJob.status === 'COMPLETED' ? 'text-green-400' :
              activeJob.status === 'ERROR' ? 'text-red-400' : 'text-gray-300'
            }`}>
              {activeJob.status === 'COMPLETED' && <CheckCircle className="inline w-3 h-3 mr-1" />}
              {activeJob.status === 'ERROR' && <XCircle className="inline w-3 h-3 mr-1" />}
              {activeJob.status === 'DOWNLOADING'
                ? `${activeJob.progress.toFixed(0)}%`
                : activeJob.status}
            </span>
          </div>

          {isActive && <ProgressBar progress={activeJob.progress} />}

          {activeJob.status === 'COMPLETED' && activeJob.downloadUrl && (
            <a
              href={`${API_BASE}${activeJob.downloadUrl.replace(API_BASE, '')}`}
              download
              className="flex items-center justify-center gap-1 bg-green-700 hover:bg-green-600 text-white rounded px-2 py-1 transition-colors w-full"
            >
              <Download className="w-3 h-3" /> Save File
            </a>
          )}

          {activeJob.status === 'ERROR' && (
            <p className="text-red-400 text-[10px] leading-snug">{activeJob.error}</p>
          )}

          {!isActive && (
            <button
              onClick={() => setActiveJob(null)}
              className="text-gray-600 hover:text-gray-400 text-[10px] w-full text-right transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Trigger button */}
      {!activeJob && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-gray-500 hover:text-white text-xs px-2 py-1 rounded-lg border border-transparent hover:border-yt-border transition-all"
        >
          <Download className="w-3 h-3" />
          <span>Download</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown */}
      {open && !activeJob && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#222] border border-yt-border rounded-xl shadow-2xl p-2 w-48 space-y-1">
          {/* Quality row */}
          <div className="flex items-center gap-1 px-1 pb-1 border-b border-yt-border">
            <span className="text-gray-500 text-[10px]">Quality:</span>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="flex-1 bg-transparent text-gray-300 text-[10px] focus:outline-none cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {QUALITY_OPTIONS.map((q) => (
                <option key={q.value} value={q.value} className="bg-[#222]">{q.label}</option>
              ))}
            </select>
          </div>

          {/* Download Video */}
          <button
            onClick={() => handleDownload('video')}
            disabled={loading === 'video'}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-yt-hover text-gray-200 text-xs transition-colors disabled:opacity-50"
          >
            {loading === 'video'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Video className="w-3.5 h-3.5 text-yt-red" />}
            Download Video
          </button>

          {/* Download MP3 */}
          <button
            onClick={() => handleDownload('audio')}
            disabled={loading === 'audio'}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-yt-hover text-gray-200 text-xs transition-colors disabled:opacity-50"
          >
            {loading === 'audio'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Music className="w-3.5 h-3.5 text-purple-400" />}
            Download MP3
          </button>

          {/* Download Thumbnail */}
          <button
            onClick={() => handleDownload('thumbnail')}
            disabled={loading === 'thumbnail'}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-yt-hover text-gray-200 text-xs transition-colors disabled:opacity-50"
          >
            {loading === 'thumbnail'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ImageIcon className="w-3.5 h-3.5 text-blue-400" />}
            Download Thumbnail
          </button>
        </div>
      )}
    </div>
  )
}
