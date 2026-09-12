'use client'

import { useState } from 'react'
import type { Video } from '../lib/api'
import VideoCard from './VideoCard'

type Filter = 'all' | 'available' | 'unavailable'

interface Props {
  videos: Video[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export default function VideoList({ videos, selectedIds, onToggle, onSelectAll, onClearAll }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const available = videos.filter((v) => v.status === 'available')
  const unavailable = videos.filter((v) => v.status !== 'available')

  const filtered = filter === 'available' ? available : filter === 'unavailable' ? unavailable : videos

  const allAvailableSelected = available.length > 0 && available.every((v) => selectedIds.has(v.id))

  return (
    <div className="bg-yt-card border border-yt-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-yt-border">
        <div className="flex items-center gap-3">
          {/* Select all checkbox */}
          <button
            onClick={allAvailableSelected ? onClearAll : onSelectAll}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                allAvailableSelected ? 'bg-yt-red border-yt-red' : 'border-gray-600'
              }`}
            >
              {allAvailableSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            {allAvailableSelected ? 'Deselect All' : 'Select All'}
          </button>
          {selectedIds.size > 0 && (
            <span className="bg-yt-red/10 text-yt-red text-xs px-2 py-0.5 rounded-full font-medium border border-yt-red/20">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-yt-dark rounded-lg p-1">
          {(['all', 'available', 'unavailable'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                filter === f ? 'bg-yt-card text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {f === 'all' ? `All (${videos.length})` : f === 'available' ? `Available (${available.length})` : `Unavailable (${unavailable.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-yt-border/50 max-h-[600px] overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-10">No videos in this category.</p>
        ) : (
          filtered.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              selected={selectedIds.has(video.id)}
              onToggle={() => onToggle(video.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
