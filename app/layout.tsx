import type { Metadata } from 'next'
import './globals.css'
import QueryProvider from '../components/QueryProvider'

export const metadata: Metadata = {
  title: 'YouTube Playlist Analyzer',
  description: 'Analyze YouTube playlists — calculate total duration, browse video list, and download permitted content.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-yt-dark text-white antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
