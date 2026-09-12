interface Props {
  progress: number
  className?: string
}

export default function ProgressBar({ progress, className = '' }: Props) {
  const clamped = Math.min(100, Math.max(0, progress))

  return (
    <div className={`w-full bg-yt-border rounded-full h-3 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          clamped >= 100 ? 'bg-green-500' : 'progress-shimmer'
        }`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
