'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Search, AlertCircle, Loader2, Youtube } from 'lucide-react'
import { analyzePlaylist } from '../lib/api'
import type { PlaylistData } from '../lib/api'

export default function HomePage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const data: PlaylistData = await analyzePlaylist(trimmed)
      sessionStorage.setItem('playlist', JSON.stringify(data))
      router.push('/results')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-yt-dark flex flex-col">
      {/* Nav */}
      <nav className="border-b border-yt-border px-6 py-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-yt-red rounded-lg p-1.5">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold text-white text-lg">PlaylistAnalyzer</span>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="w-full max-w-2xl text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="bg-yt-red/10 border border-yt-red/20 rounded-2xl p-5">
              <Youtube className="w-14 h-14 text-yt-red" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              YouTube Playlist
              <span className="text-yt-red"> Analyzer</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
              Paste a playlist or individual video URL to calculate total duration,
              browse all videos, and download content you have permission to access.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Playlist URL or individual video URL (youtu.be/...)"
                  className="w-full bg-yt-card border border-yt-border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-yt-red/50 focus:ring-1 focus:ring-yt-red/30 transition-all"
                  disabled={loading}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="bg-yt-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analyze
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/50 rounded-xl p-4 text-left">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-300 font-medium text-sm">Analysis Failed</p>
                  <p className="text-red-400/80 text-sm mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </form>



          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {['Total Duration', 'Video Count', 'Average Length', 'Shortest & Longest', 'Download Manager'].map((f) => (
              <span key={f} className="bg-yt-card border border-yt-border text-gray-400 text-xs px-3 py-1.5 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-yt-border px-6 py-4 text-center">
        <p className="text-gray-600 text-xs">
          You are responsible for ensuring you have the right to download any content. Only download what you own or have permission to access.
        </p>
      </footer>
    </main>
  )
}
