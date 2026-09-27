import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    // Direct 307 redirect to Hetzner HTTPS stream (0 bytes transferred through Vercel origin)
    return NextResponse.redirect(`https://media.167.233.201.31.nip.io/outputs/${cleanFileName}`, 307)
  } catch (err) {
    return new NextResponse(err instanceof Error ? err.message : 'Sunucu hatasi', { status: 500 })
  }
}
