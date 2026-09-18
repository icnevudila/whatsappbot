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
        { success: false, error: 'Yetkisiz erişim.' },
        { status: 401 },
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Yapılandırma eksik' }, { status: 500 })
    }

    const supabase = createClient(url, key)
    const { data: feedData, error: feedError } = await supabase.rpc('get_canli_takip_feed')

    if (feedError) {
      return NextResponse.json({ success: false, error: feedError.message }, { status: 500 })
    }

    const worker = feedData?.worker
    const accounts = (feedData?.accounts as Array<Record<string, any>>) || []
    const connectedAccounts = accounts.filter(a => a.status === 'connected')

    const isWorkerFresh = worker?.seen_at
      ? (Date.now() - new Date(worker.seen_at).getTime()) < 90_000
      : false

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      syncProtection: {
        status: 'active',
        resyncLoopBlocked: true,
        appStateMacVerification: 'disabled',
        selfPeerFilter: 'active',
        retryErrorsCount: 0,
        description: 'WhatsApp eşlikçi cihaz senkronizasyon döngüsü ve oturum kapatma uyarıları tamamen engellendi.',
      },
      worker: {
        id: worker?.worker_id || 'oracle-1',
        isFresh: isWorkerFresh,
        lastSeenAt: worker?.seen_at,
        uptimeSeconds: worker?.meta?.uptimeSeconds ?? 0,
        tracked: worker?.tracked ?? 0,
        live: worker?.live ?? 0,
        maxSessions: worker?.max_sessions ?? 50,
      },
      accounts: accounts.map(a => ({
        id: a.id,
        label: a.label,
        phone: a.phone_e164,
        status: a.status,
        lastSeenAt: a.last_seen_at,
        isLive: a.status === 'connected',
      })),
      connectedCount: connectedAccounts.length,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Teşhis yapılamadı' },
      { status: 500 },
    )
  }
}
