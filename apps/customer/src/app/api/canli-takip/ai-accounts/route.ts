import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://167.233.201.31:3456'

export async function GET() {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const res = await fetch(`${GATEWAY_URL}/v1/ai-engine/status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'Gateway yanıt vermedi' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, ...data })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Bağlantı hatası' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body = await req.json()
    const { action, port, name, flowProjectUrl } = body

    if (action === 'verify') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
        signal: AbortSignal.timeout(12000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'reset_limit') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/reset-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
        signal: AbortSignal.timeout(5000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'provision') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, name, flowProjectUrl }),
        signal: AbortSignal.timeout(8000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'update_flow') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const { flowCredits } = body
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/update-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, flowProjectUrl, flowCredits }),
        signal: AbortSignal.timeout(20000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'auto_detect_flow') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/auto-detect-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
        signal: AbortSignal.timeout(20000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'refresh_flow') {
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/refresh-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(port ? { port } : {}),
        signal: AbortSignal.timeout(135000),
      })
      const result = await gwRes.json()
      const supabase = createSupabaseServiceClient()
      const persistenceErrors: string[] = []

      if (!supabase) {
        persistenceErrors.push('SUPABASE_SERVICE_ROLE_KEY eksik; gerçek kredi verisi veritabanına yazılamadı')
      } else if (Array.isArray(result.results)) {
        for (const item of result.results) {
          if (!item?.accountId) continue
          const { data: previous, error: readError } = await supabase
            .from('flow_accounts')
            .select('id,email,display_name,status,current_job_id,credit_balance')
            .eq('id', item.accountId)
            .maybeSingle()
          if (readError || !previous) {
            persistenceErrors.push(`${item.accountId}: hesap kaydı bulunamadı`)
            continue
          }

          const now = item.checkedAt || new Date().toISOString()
          const update: Record<string, unknown> = {
            updated_at: now,
            last_heartbeat_at: now,
          }
          if (item.email) update.email = item.email
          if (item.email && (!previous.display_name || previous.display_name.includes('account-'))) {
            update.display_name = `Flow ${item.email}`
          }
          if (Number.isFinite(Number(item.credits))) {
            update.credit_balance = Number(item.credits)
            update.last_credit_checked_at = now
          }
          if (!previous.current_job_id && previous.status !== 'busy') {
            update.status = item.ok && item.profileSynced ? 'idle' : 'needs_reauth'
          }

          const { error: updateError } = await supabase
            .from('flow_accounts')
            .update(update)
            .eq('id', item.accountId)
          if (updateError) {
            persistenceErrors.push(`${item.accountId}: ${updateError.message}`)
            continue
          }

          const nextCredits = Number.isFinite(Number(item.credits)) ? Number(item.credits) : null
          const beforeCredits = previous.credit_balance == null ? null : Number(previous.credit_balance)
          if (nextCredits != null && nextCredits !== beforeCredits) {
            const { error: eventError } = await supabase.from('flow_account_events').insert({
              account_id: item.accountId,
              event_type: 'CREDIT_BALANCE_SYNCED',
              before_credits: beforeCredits,
              after_credits: nextCredits,
              details: {
                source: item.creditSource || 'flow_account_menu',
                port: item.port,
                checked_at: now,
                profile_synced: item.profileSynced === true,
              },
            })
            if (eventError) persistenceErrors.push(`${item.accountId} event: ${eventError.message}`)
          }
        }
      }

      return NextResponse.json({
        success: gwRes.ok && result.synced > 0 && persistenceErrors.length === 0,
        ...result,
        persisted: persistenceErrors.length === 0,
        persistenceErrors,
      }, { status: gwRes.ok ? 200 : gwRes.status })
    }

    if (action === 'sync_cookies') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const { cookies, platform } = body
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/sync-cookies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, cookies, platform }),
        signal: AbortSignal.timeout(15000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'update_slot') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const { enabled } = body
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/update-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, name, enabled }),
        signal: AbortSignal.timeout(5000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    return NextResponse.json({ success: false, error: 'Geçersiz aksiyon' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'İşlem başarısız' },
      { status: 500 },
    )
  }
}
