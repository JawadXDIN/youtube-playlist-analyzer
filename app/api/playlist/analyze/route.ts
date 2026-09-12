import { NextRequest, NextResponse } from 'next/server'

function secondsToHuman(seconds: number): string {
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

function parseDurationText(text?: string): number {
  if (!text) return 0
  const parts = text.trim().split(':').map((p) => parseInt(p, 10))
  if (parts.some(isNaN)) return 0
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 1) {
    return parts[0]
  }
  return 0
}

function secondsToTimestamp(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseYouTubeUrl(rawUrl: string): { type: 'playlist' | 'video' | 'unknown'; id: string } {
  try {
    const url = new URL(rawUrl.trim())
    const host = url.hostname.replace('www.', '')

    if (host === 'youtu.be') {
      const vid = url.pathname.slice(1).split('?')[0]
      return { type: 'video', id: vid }
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const list = url.searchParams.get('list')
      if (list) return { type: 'playlist', id: list }

      const v = url.searchParams.get('v')
      if (v) return { type: 'video', id: v }

      if (url.pathname.startsWith('/shorts/')) {
        const vid = url.pathname.split('/shorts/')[1]?.split('/')[0]
        if (vid) return { type: 'video', id: vid }
      }
    }
  } catch {}
  return { type: 'unknown', id: '' }
}

async function extractSingleVideo(videoId: string, originalUrl: string) {
  let title = 'YouTube Video'
  let uploader = ''
  let durationSeconds = 0

  // 1. Try YouTube oEmbed
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { next: { revalidate: 3600 } }
    )
    if (oembedRes.ok) {
      const data = await oembedRes.json()
      title = data.title || title
      uploader = data.author_name || uploader
    }
  } catch {}

  // 2. Try fetching video page for precise duration
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (pageRes.ok) {
      const html = await pageRes.text()
      const lengthMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/) || html.match(/"lengthSeconds"\s*:\s*"(\d+)"/)
      if (lengthMatch) {
        const val = parseInt(lengthMatch[1], 10)
        durationSeconds = lengthMatch[0].includes('Ms') ? Math.floor(val / 1000) : val
      }
      const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/) || html.match(/<title>([^<]+)<\/title>/)
      if (titleMatch && title === 'YouTube Video') {
        title = titleMatch[1].replace(' - YouTube', '')
      }
      const authorMatch = html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/)
      if (authorMatch && !uploader) {
        uploader = authorMatch[1]
      }
    }
  } catch {}

  const video = {
    id: videoId,
    title,
    duration_seconds: durationSeconds,
    duration_str: secondsToTimestamp(durationSeconds),
    position: 1,
    status: 'available' as const,
    thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  }

  return {
    id: `single_${videoId}`,
    title,
    uploader,
    video_count: 1,
    available_count: 1,
    unavailable_count: 0,
    total_seconds: durationSeconds,
    total_duration: secondsToHuman(durationSeconds),
    average_duration: secondsToHuman(durationSeconds),
    shortest_video: video,
    longest_video: video,
    videos: [video],
  }
}

async function extractPlaylist(playlistId: string) {
  const url = `https://www.youtube.com/playlist?list=${playlistId}`
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!res.ok) {
    throw new Error('Could not load playlist from YouTube. Ensure it is public.')
  }

  const html = await res.text()

  // Extract ytInitialData
  const match = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/) || html.match(/window\["ytInitialData"\]\s*=\s*({.+?});/)
  if (!match) {
    throw new Error('Could not parse playlist information from YouTube.')
  }

  const data = JSON.parse(match[1])

  // Extract playlist title & owner
  const metadata = data?.metadata?.playlistMetadataRenderer || {}
  const header = data?.header?.playlistHeaderRenderer || {}
  const title = metadata?.title || header?.title?.simpleText || 'YouTube Playlist'
  const uploader = header?.ownerText?.runs?.[0]?.text || metadata?.author || ''

  // Extract video items
  const videos: any[] = []
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || []
  const tabContent = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || []

  let position = 1
  for (const item of tabContent) {
    const vr = item.playlistVideoRenderer
    if (!vr) continue

    const vidId = vr.videoId
    if (!vidId) continue

    const vTitle = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '[Unavailable]'
    const durationText = vr.lengthText?.simpleText || ''
    const durationSeconds = parseDurationText(durationText) || parseInt(vr.lengthSeconds || '0', 10)

    const isAvailable = vr.isPlayable !== false && !vTitle.includes('[Private') && !vTitle.includes('[Deleted')

    videos.push({
      id: vidId,
      title: vTitle,
      duration_seconds: durationSeconds,
      duration_str: secondsToTimestamp(durationSeconds),
      position: position++,
      status: isAvailable ? 'available' : 'unavailable',
      thumbnail_url: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${vidId}`,
    })
  }

  if (videos.length === 0) {
    throw new Error('This playlist appears to be empty or private.')
  }

  const available = videos.filter((v) => v.status === 'available')
  const totalSecs = available.reduce((acc, v) => acc + v.duration_seconds, 0)
  const avgSecs = available.length > 0 ? Math.floor(totalSecs / available.length) : 0
  const shortest = available.length > 0 ? [...available].sort((a, b) => a.duration_seconds - b.duration_seconds)[0] : null
  const longest = available.length > 0 ? [...available].sort((a, b) => b.duration_seconds - a.duration_seconds)[0] : null

  return {
    id: playlistId,
    title,
    uploader,
    video_count: videos.length,
    available_count: available.length,
    unavailable_count: videos.length - available.length,
    total_seconds: totalSecs,
    total_duration: secondsToHuman(totalSecs),
    average_duration: secondsToHuman(avgSecs),
    shortest_video: shortest,
    longest_video: longest,
    videos,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const rawUrl = body?.url?.trim()

    if (!rawUrl) {
      return NextResponse.json({ detail: 'URL is required' }, { status: 422 })
    }

    const { type, id } = parseYouTubeUrl(rawUrl)

    if (type === 'unknown' || !id) {
      return NextResponse.json(
        { detail: 'Invalid YouTube URL. Please provide a playlist or video link.' },
        { status: 422 }
      )
    }

    if (type === 'video') {
      const result = await extractSingleVideo(id, rawUrl)
      return NextResponse.json(result)
    }

    const result = await extractPlaylist(id)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || 'Could not analyze this playlist.' },
      { status: 500 }
    )
  }
}
