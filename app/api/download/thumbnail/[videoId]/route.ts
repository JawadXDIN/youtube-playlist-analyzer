import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const videoId = params.videoId
  try {
    let thumbRes = await fetch(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
    if (!thumbRes.ok) {
      thumbRes = await fetch(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
    }
    const arrayBuffer = await thumbRes.arrayBuffer()
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${videoId}.jpg"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ detail: 'Failed to fetch thumbnail' }, { status: 502 })
  }
}
