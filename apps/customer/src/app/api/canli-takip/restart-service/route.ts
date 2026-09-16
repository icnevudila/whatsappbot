import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim. Lütfen şifre ile giriş yapın.' },
        { status: 401 },
      )
    }

    const supabase = createSupabaseServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY eksik. Restart için servis yetkisi gerekir.' },
        { status: 500 },
      )
    }

    const { data, error } = await supabase.rpc('restart_baileys_service')

    if (!error) {
      return NextResponse.json(data ?? { success: true, message: 'Restart işi kuyruğa alındı.' })
    }

    const fallback = await supabase
      .from('jobs')
      .insert({
        type: 'service.restart',
        payload: {},
        priority: 1,
        max_attempts: 1,
      })
      .select('id')
      .single()

    if (fallback.error) {
      return NextResponse.json(
        {
          success: false,
          error: `Restart RPC çalışmadı (${error.message}); fallback job da açılamadı (${fallback.error.message}). Migration eksik olabilir.`,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Restart işi doğrudan kuyruğa alındı.',
      jobId: fallback.data?.id,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'İşlem başarısız' },
      { status: 500 },
    )
  }
}
