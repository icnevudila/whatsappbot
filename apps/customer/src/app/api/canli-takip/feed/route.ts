import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim. Lütfen şifre ile giriş yapın.' },
        { status: 401 },
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      return NextResponse.json(
        { success: false, error: 'Supabase URL veya anahtarı eksik.' },
        { status: 500 },
      )
    }

    const supabase = createClient(url, key)
    const { data, error } = await supabase.rpc('get_canli_takip_feed')

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    let aiEngineStatus = null
    try {
      const aiRes = await fetch('http://167.233.201.31:3456/v1/ai-engine/status', {
        signal: AbortSignal.timeout(4500),
        cache: 'no-store',
      })
      if (aiRes.ok) {
        aiEngineStatus = await aiRes.json()
        if (aiEngineStatus && Array.isArray(aiEngineStatus.recentVideos)) {
          aiEngineStatus.recentVideos = aiEngineStatus.recentVideos.map((v: any) => {
            const vFile = v.filename || ''
            const tFile = v.thumbnailUrl ? v.thumbnailUrl.split('/').pop() : ''
            return {
              ...v,
              videoUrl: `/api/canli-takip/media-proxy?file=${encodeURIComponent(vFile)}`,
              thumbnailUrl: tFile ? `/api/canli-takip/media-proxy?file=${encodeURIComponent(tFile)}` : null,
            }
          })
        }
      }
    } catch {
      // Gateway geçici olarak ulaşılamazsa sessizce geç
    }

    return NextResponse.json({
      ...data,
      ai_engine: aiEngineStatus,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Veriler alınamadı' },
      { status: 500 },
    )
  }
}
