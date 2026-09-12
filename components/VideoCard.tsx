import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import type { Video } from '../lib/api'
import VideoDownloadMenu from './VideoDownloadMenu'

interface Props {
  video: Video
  selected: boolean
  onToggle: () => void
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  available: { label: 'Available', cls: 'bg-green-900/40 text-green-400 border-green-800/40' },
  private: { label: 'Private', cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40' },
  deleted: { label: 'Deleted', cls: 'bg-red-900/40 text-red-400 border-red-800/40' },
  unavailable: { label: 'Unavailable', cls: 'bg-gray-800 text-gray-500 border-gray-700' },
}

export default function VideoCard({ video, selected, onToggle }: Props) {
  const isSelectable = video.status === 'available'
  const badge = STATUS_BADGE[video.status] || STATUS_BADGE['unavailable']

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-xl border transition-all group ${
        selected ? 'border-yt-red/40 bg-yt-red/5' : 'border-transparent hover:border-yt-border'
      }`}
    >
      {/* Main row */}
      <div
        className={`flex items-center gap-3 ${isSelectable ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
        onClick={() => isSelectable && onToggle()}
      >
        {/* Checkbox */}
        <div
          className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
            selected ? 'bg-yt-red border-yt-red' : 'border-gray-600 group-hover:border-gray-400'
          } ${!isSelectable ? 'opacity-0 pointer-events-none' : ''}`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Position */}
        <span className="text-gray-600 text-xs font-mono w-6 shrink-0 text-right">
          {video.position.toString().padStart(2, '0')}
        </span>

        {/* Thumbnail */}
        <div className="relative w-20 h-12 shrink-0 rounded-lg overflow-hidden bg-yt-border">
          {video.thumbnail_url ? (
            <Image
              src={video.thumbnail_url}
              alt={video.title}
              fill
              className="object-cover"
              sizes="80px"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full bg-yt-border" />
          )}
          {video.duration_str && video.status === 'available' && (
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-mono px-1 rounded">
              {video.duration_str}
            </div>
          )}
        </div>

        {/* Title & badge */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isSelectable ? 'text-white' : 'text-gray-500'}`}>
            {video.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${badge.cls}`}>
              {badge.label}
            </span>
            {video.status === 'available' && (
              <span className="text-gray-500 text-[10px] font-mono">{video.duration_str}</span>
            )}
          </div>
        </div>

        {/* External link */}
        {video.url && (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-600 hover:text-gray-300 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Per-video download menu — only for available videos */}
      {video.status === 'available' && (
        <div className="pl-14 flex justify-start" onClick={(e) => e.stopPropagation()}>
          <VideoDownloadMenu videoId={video.id} videoTitle={video.title} />
        </div>
      )}
    </div>
  )
}
