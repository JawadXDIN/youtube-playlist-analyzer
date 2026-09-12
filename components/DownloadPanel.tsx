'use client'

import { useState } from 'react'
import { Download, Video, Music, ChevronDown } from 'lucide-react'
import { startDownload } from '../lib/api'
import DownloadProgress from './DownloadProgress'

interface Props {
  selectedIds: Set<string>
}

const QUALITY_OPTIONS = [
  { value: 'best', label: 'Best Available' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
]

export default function DownloadPanel({ selectedIds }: Props) {
  const [format, setFormat] = useState<'video' | 'audio'>('video')
  const [quality, setQuality] = useState('best')
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (selectedIds.size === 0) return null

  async function handleDownload() {
    setLoading(true)
    setError(null)
    setJobId(null)
    try {
      const res = await startDownload(
        Array.from(selectedIds),
        format,
        format === 'audio' ? 'best' : quality
      )
      setJobId(res.job_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start download.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-yt-card/95 backdrop-blur border-t border-yt-border shadow-2xl">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {jobId ? (
          <DownloadProgress jobId={jobId} onClose={() => setJobId(null)} />
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Selected count */}
            <div className="shrink-0">
              <span className="text-white font-bold text-lg">{selectedIds.size}</span>
              <span className="text-gray-400 text-sm ml-1">
                video{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Format toggle */}
              <div className="flex bg-yt-dark border border-yt-border rounded-lg p-1 gap-1">
                <button
                  onClick={() => setFormat('video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    format === 'video'
                      ? 'bg-yt-red text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Video
                </button>
                <button
                  onClick={() => setFormat('audio')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    format === 'audio'
                      ? 'bg-yt-red text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  Audio
                </button>
              </div>

              {/* Quality selector */}
              {format === 'video' && (
                <div className="relative">
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="appearance-none bg-yt-dark border border-yt-border text-white text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-yt-red/50 cursor-pointer"
                  >
                    {QUALITY_OPTIONS.map((q) => (
                      <option key={q.value} value={q.value}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Error */}
            {error && <p className="text-red-400 text-xs">{error}</p>}

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={loading}
              className="shrink-0 bg-yt-red hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              {loading ? 'Starting...' : 'Download Selected'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
