import { Clock, Video, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import type { PlaylistData } from '../lib/api'

interface Props {
  playlist: PlaylistData
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-yt-card border border-yt-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-gray-500 text-xs">{sub}</p>}
    </div>
  )
}

export default function PlaylistStats({ playlist }: Props) {
  return (
    <div className="space-y-4">
      {/* Main stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Video className="w-4 h-4" />}
          label="Total Videos"
          value={playlist.video_count.toString()}
          sub={`${playlist.available_count} available`}
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="Total Duration"
          value={playlist.total_duration}
          sub="sum of available videos"
        />
        <StatCard
          icon={<TrendingDown className="w-4 h-4" />}
          label="Average Length"
          value={playlist.average_duration}
          sub="per video"
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Unavailable"
          value={playlist.unavailable_count.toString()}
          sub={playlist.unavailable_count > 0 ? 'private / deleted' : 'all videos accessible'}
        />
      </div>

      {/* Shortest / Longest */}
      {(playlist.shortest_video || playlist.longest_video) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {playlist.shortest_video && (
            <div className="bg-yt-card border border-yt-border rounded-2xl p-4 flex items-center gap-4">
              <div className="bg-green-900/30 border border-green-800/30 rounded-lg p-2.5">
                <TrendingDown className="w-4 h-4 text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-400 text-xs mb-1">Shortest Video</p>
                <p className="text-white text-sm font-medium truncate">{playlist.shortest_video.title}</p>
                <p className="text-gray-500 text-xs font-mono">{playlist.shortest_video.duration_str}</p>
              </div>
            </div>
          )}
          {playlist.longest_video && (
            <div className="bg-yt-card border border-yt-border rounded-2xl p-4 flex items-center gap-4">
              <div className="bg-orange-900/30 border border-orange-800/30 rounded-lg p-2.5">
                <TrendingUp className="w-4 h-4 text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-400 text-xs mb-1">Longest Video</p>
                <p className="text-white text-sm font-medium truncate">{playlist.longest_video.title}</p>
                <p className="text-gray-500 text-xs font-mono">{playlist.longest_video.duration_str}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
