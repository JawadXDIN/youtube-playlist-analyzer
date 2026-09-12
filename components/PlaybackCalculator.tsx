'use client'

import { useState } from 'react'
import { Gauge, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  totalSeconds: number
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s || !parts.length) parts.push(`${s}s`)
  return parts.join(' ')
}

function formatDays(totalSeconds: number, dailySeconds: number): string {
  if (dailySeconds <= 0) return '—'
  const days = totalSeconds / dailySeconds
  const fullDays = Math.floor(days)
  const remainderH = Math.floor((days - fullDays) * 24)
  const remainderM = Math.floor(((days - fullDays) * 24 - remainderH) * 60)
  const parts: string[] = []
  if (fullDays) parts.push(`${fullDays}d`)
  if (remainderH) parts.push(`${remainderH}h`)
  if (remainderM) parts.push(`${remainderM}m`)
  return parts.join(' ') || '< 1m'
}

export default function PlaybackCalculator({ totalSeconds }: Props) {
  const [open, setOpen] = useState(true)
  const [dailyHours, setDailyHours] = useState(1)
  const [dailyMinutes, setDailyMinutes] = useState(0)

  const dailyTotalSeconds = dailyHours * 3600 + dailyMinutes * 60

  return (
    <div className="bg-yt-card border border-yt-border rounded-2xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-yt-hover transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-purple-900/40 border border-purple-700/30 rounded-lg p-1.5">
            <Gauge className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-semibold text-white">Playback Speed Calculator</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-6">
          {/* Speed table */}
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Watch time at different speeds
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SPEEDS.map((speed) => {
                const adjusted = totalSeconds / speed
                const isNormal = speed === 1
                return (
                  <div
                    key={speed}
                    className={`rounded-xl p-3 border text-center transition-all ${
                      isNormal
                        ? 'bg-purple-900/20 border-purple-700/40'
                        : 'bg-yt-dark border-yt-border'
                    }`}
                  >
                    <p className={`text-lg font-bold ${isNormal ? 'text-purple-300' : 'text-white'}`}>
                      {speed}×
                    </p>
                    <p className="text-gray-300 text-xs font-mono mt-1">
                      {formatDuration(adjusted)}
                    </p>
                    {speed !== 1 && (
                      <p className="text-gray-600 text-[10px] mt-0.5">
                        {speed > 1
                          ? `${formatDuration(totalSeconds - adjusted)} saved`
                          : `${formatDuration(adjusted - totalSeconds)} extra`}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Completion planner */}
          <div className="border-t border-yt-border pt-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Completion planner
            </p>
            <p className="text-gray-500 text-xs mb-4">
              How much time can you dedicate per day? We'll calculate how long to finish.
            </p>

            {/* Daily time input */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex items-center gap-2 bg-yt-dark border border-yt-border rounded-xl px-3 py-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Math.max(0, Math.min(23, Number(e.target.value))))}
                  className="w-12 bg-transparent text-white text-center font-bold text-lg focus:outline-none"
                />
                <span className="text-gray-400 text-sm">hr</span>
              </div>
              <span className="text-gray-600">:</span>
              <div className="flex items-center gap-2 bg-yt-dark border border-yt-border rounded-xl px-3 py-2">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                  className="w-12 bg-transparent text-white text-center font-bold text-lg focus:outline-none"
                />
                <span className="text-gray-400 text-sm">min</span>
              </div>
              <span className="text-gray-500 text-sm">per day</span>
            </div>

            {/* Results at different speeds */}
            {dailyTotalSeconds > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[0.75, 1, 1.5, 2].map((speed) => {
                  const watchTime = totalSeconds / speed
                  const result = formatDays(watchTime, dailyTotalSeconds)
                  const isNormal = speed === 1
                  return (
                    <div
                      key={speed}
                      className={`rounded-xl p-3 border text-center ${
                        isNormal
                          ? 'bg-purple-900/20 border-purple-700/40'
                          : 'bg-yt-dark border-yt-border'
                      }`}
                    >
                      <p className={`text-sm font-bold mb-1 ${isNormal ? 'text-purple-300' : 'text-gray-300'}`}>
                        {speed}× speed
                      </p>
                      <p className="text-white font-mono text-lg font-bold">{result}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">to finish</p>
                    </div>
                  )
                })}
              </div>
            )}

            {dailyTotalSeconds === 0 && (
              <p className="text-gray-600 text-sm text-center py-4">
                Enter your daily available time above to see the estimate.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
