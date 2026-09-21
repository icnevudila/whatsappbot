import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GATEWAY_HOST =
  process.env.OMNISTUDIO_GATEWAY_URL || process.env.AI_GATEWAY_URL || 'http://167.233.201.31:3456'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    let fileName = searchParams.get('file')
    const rawUrl = searchParams.get('url')

    if (!fileName && rawUrl) {
      try {
        const u = new URL(rawUrl)
        fileName = u.pathname.split('/').pop() || null
      } catch {
        fileName = null
      }
    }

    if (!fileName) {
      return new NextResponse('Dosya adi belirtilmedi', { status: 400 })
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '')
    if (!cleanFileName || cleanFileName.includes('..')) {
      return new NextResponse('Gecersiz dosya adi', { status: 400 })
    }

    const upstreamUrl = `${GATEWAY_HOST}/outputs/${cleanFileName}`
    const rangeHeader = req.headers.get('range')
    const fetchHeaders: Record<string, string> = {}
    if (rangeHeader) {
      fetchHeaders['range'] = rangeHeader
    }

    const upstreamRes = await fetch(upstreamUrl, {
      headers: fetchHeaders,
      cache: 'no-store',
    })

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse(`Medya yuklenemedi (${upstreamRes.status})`, { status: upstreamRes.status })
    }

    const resHeaders = new Headers()
    const contentType = upstreamRes.headers.get('content-type') || 
      (cleanFileName.endsWith('.mp4') ? 'video/mp4' : 
       cleanFileName.endsWith('.jpg') || cleanFileName.endsWith('.jpeg') ? 'image/jpeg' : 
       cleanFileName.endsWith('.png') ? 'image/png' : 'application/octet-stream')
    resHeaders.set('Content-Type', contentType)
    
    const contentLength = upstreamRes.headers.get('content-length')
    if (contentLength) resHeaders.set('Content-Length', contentLength)

    const contentRange = upstreamRes.headers.get('content-range')
    if (contentRange) resHeaders.set('Content-Range', contentRange)

    resHeaders.set('Accept-Ranges', 'bytes')
    resHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status === 206 ? 206 : 200,
      headers: resHeaders,
    })
  } catch (err) {
    return new NextResponse(err instanceof Error ? err.message : 'Sunucu hatasi', { status: 500 })
  }
}
