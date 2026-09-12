'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, X, Download, Loader2, Zap, Clock } from 'lucide-react'
import { getJobStatus } from '../lib/api'
import type { DownloadJob } from '../lib/api'
import ProgressBar from './ProgressBar'

interface Props {
  jobId: string
  onClose: () => void
}

const STATUS_LABELS: Record<DownloadJob['status'], string> = {
  QUEUED: 'Queued',
  STARTING: 'Starting...',
  DOWNLOADING: 'Downloading',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  ERROR: 'Failed',
}

const isActive = (status: DownloadJob['status']) =>
  ['QUEUED', 'STARTING', 'DOWNLOADING', 'PROCESSING'].includes(status)

export default function DownloadProgress({ jobId, onClose }: Props) {
  const { data: job, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJobStatus(jobId),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 1500
      return isActive(data.status) ? 1500 : false
    },
  })

  if (error) {
    return (
      <div className="bg-yt-card border border-red-800/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-red-400 font-semibold">Download Error</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-400 text-sm">Could not get job status. Try again.</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="bg-yt-card border border-yt-border rounded-2xl p-5 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-yt-red" />
        <span className="text-gray-400 text-sm">Connecting to job...</span>
      </div>
    )
  }

  return (
    <div className="bg-yt-card border border-yt-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {job.status === 'COMPLETED' && <CheckCircle className="w-5 h-5 text-green-400" />}
          {job.status === 'ERROR' && <XCircle className="w-5 h-5 text-red-400" />}
          {isActive(job.status) && <Loader2 className="w-5 h-5 text-yt-red animate-spin" />}
          <span
            className={`font-semibold text-sm ${
              job.status === 'COMPLETED'
                ? 'text-green-400'
                : job.status === 'ERROR'
                ? 'text-red-400'
                : 'text-white'
            }`}
          >
            {STATUS_LABELS[job.status]}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      {job.status !== 'ERROR' && (
        <ProgressBar progress={job.progress} />
      )}

      {/* Stats */}
      {isActive(job.status) && (
        <div className="flex gap-4 text-xs text-gray-400">
          <span className="font-mono text-white font-semibold">
            {job.progress.toFixed(1)}%
          </span>
          {job.speed && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" /> {job.speed}
            </span>
          )}
          {job.eta && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> ETA: {job.eta}
            </span>
          )}
        </div>
      )}

      {/* Completed */}
      {job.status === 'COMPLETED' && job.download_url && (
        <a
          href={`http://localhost:8000${job.download_url.replace('http://localhost:8000', '')}`}
          download
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors w-full"
        >
          <Download className="w-4 h-4" />
          Download File
        </a>
      )}

      {/* Error */}
      {job.status === 'ERROR' && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-3">
          <p className="text-red-400 text-sm">
            {job.error || 'Download failed. The video may be unavailable or restricted.'}
          </p>
        </div>
      )}
    </div>
  )
}
