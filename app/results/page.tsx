'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Play, User } from 'lucide-react'
import type { PlaylistData, Video } from '../../lib/api'
import PlaylistStats from '../../components/PlaylistStats'
import PlaybackCalculator from '../../components/PlaybackCalculator'
import VideoList from '../../components/VideoList'
import DownloadPanel from '../../components/DownloadPanel'

export default function ResultsPage() {
  const router = useRouter()
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const raw = sessionStorage.getItem('playlist')
    if (!raw) {
      router.replace('/')
      return
    }
    try {
      setPlaylist(JSON.parse(raw))
    } catch {
      router.replace('/')
    }
  }, [router])

  if (!playlist) {
    return (
      <div className="min-h-screen bg-yt-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yt-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const availableVideos: Video[] = playlist.videos.filter((v) => v.status === 'available')

  function toggleVideo(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(availableVideos.map((v) => v.id)))
  }

  function clearAll() {
    setSelectedIds(new Set())
  }

  return (
    <main className="min-h-screen bg-yt-dark pb-28">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-yt-dark/95 backdrop-blur border-b border-yt-border px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          New Analysis
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <div className="bg-yt-red rounded p-1">
            <Play className="w-3 h-3 text-white fill-white" />
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">PlaylistAnalyzer</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            {playlist.title}
          </h1>
          {playlist.uploader && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <User className="w-4 h-4" />
              <span>{playlist.uploader}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <section>
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Statistics
          </h2>
          <PlaylistStats playlist={playlist} />
        </section>

        {/* Playback Calculator */}
        {playlist.total_seconds > 0 && (
          <section>
            <PlaybackCalculator totalSeconds={playlist.total_seconds} />
          </section>
        )}

        {/* Video List */}
        <section>
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Videos
          </h2>
          <VideoList
            videos={playlist.videos}
            selectedIds={selectedIds}
            onToggle={toggleVideo}
            onSelectAll={selectAll}
            onClearAll={clearAll}
          />
        </section>
      </div>

      {/* Sticky Download Panel */}
      <DownloadPanel selectedIds={selectedIds} />
    </main>
  )
}
