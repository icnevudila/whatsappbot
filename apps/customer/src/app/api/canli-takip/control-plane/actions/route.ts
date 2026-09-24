import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { recordOperatorEvent } from '@/lib/control-plane/server'

export const runtime = 'nodejs'

type OperatorAction =
  | 'retry_job'
  | 'cancel_queued_job'
  | 'restart_whatsapp_worker'
  | 'enable_account'
  | 'disable_account'
  | 'clear_account_cooldown'

function parseTarget(raw: unknown) {
  const value = typeof raw === 'string' ? raw.trim() : ''
  const separator = value.indexOf(':')
  if (separator <= 0 || separator === value.length - 1) return null
  return { source: value.slice(0, separator), id: value.slice(separator + 1) }
}

export async function POST(request: Request) {
  if (!(await checkIsAuthenticated())) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Servis veritabanı bağlantısı yapılandırılmamış' }, { status: 503 })
  }

  try {
    const body = await request.json() as { action?: OperatorAction; targetId?: string }
    const action = body.action
    const target = parseTarget(body.targetId)
    if (!action || !target) {
      return NextResponse.json({ success: false, error: 'Geçerli action ve targetId zorunludur' }, { status: 400 })
    }

    if (action === 'restart_whatsapp_worker') {
      if (target.source !== 'worker') {
        return NextResponse.json({ success: false, error: 'Bu işlem yalnız WhatsApp worker için kullanılabilir' }, { status: 400 })
      }
      const { data, error } = await supabase.rpc('restart_baileys_service')
      if (error) throw error
      await recordOperatorEvent({ eventType: 'WORKER_RESTART_REQUESTED', workerId: target.id, message: `${target.id} için güvenli restart istendi`, payload: { operator_action: true } })
      return NextResponse.json(data || { success: true })
    }

    if (action === 'retry_job' || action === 'cancel_queued_job') {
      const isRetry = action === 'retry_job'
      if (!['jobs', 'channel_jobs', 'ai_media_jobs'].includes(target.source)) {
        return NextResponse.json({ success: false, error: 'Bu iş türü güvenli retry/cancel desteklemiyor' }, { status: 409 })
      }

      if (target.source === 'ai_media_jobs') {
        const expected = isRetry ? ['FAILED', 'NEEDS_REVIEW'] : ['PENDING', 'QUEUED']
        const nextState = isRetry ? 'QUEUED' : 'FAILED'
        const { data: job, error: readError } = await supabase.from('ai_media_jobs').select('id,org_id,state,retry_count,max_retries').eq('id', target.id).maybeSingle()
        if (readError || !job) return NextResponse.json({ success: false, error: 'İş bulunamadı' }, { status: 404 })
        if (!expected.includes(job.state)) return NextResponse.json({ success: false, error: `İş ${job.state} durumunda; işlem reddedildi` }, { status: 409 })
        if (isRetry && job.retry_count >= job.max_retries) return NextResponse.json({ success: false, error: 'Maksimum retry sayısına ulaşıldı' }, { status: 409 })
        const update: Record<string, unknown> = {
          state: nextState,
          error_code: isRetry ? null : 'OPERATOR_CANCELLED',
          error_message: isRetry ? null : 'Queued job cancelled by operator',
          lease_worker_id: null,
          lease_account_id: null,
          lease_timeout_at: null,
          updated_at: new Date().toISOString(),
        }
        if (isRetry) update.retry_count = job.retry_count + 1
        const { error } = await supabase.from('ai_media_jobs').update(update).eq('id', target.id).in('state', expected)
        if (error) throw error
        await supabase.from('ai_media_events').insert({
          job_id: target.id, org_id: job.org_id,
          event_type: isRetry ? 'JOB_RETRY_REQUESTED' : 'JOB_CANCELLED',
          from_state: job.state, to_state: nextState,
          message: isRetry ? 'Operator requested a safe retry' : 'Operator cancelled a queued job',
          payload: { operator_action: true },
        })
        return NextResponse.json({ success: true, message: isRetry ? 'İş yeniden kuyruğa alındı' : 'Kuyruktaki iş iptal edildi' })
      }

      const table = target.source as 'jobs' | 'channel_jobs'
      const expected = isRetry ? ['failed'] : ['pending']
      const { data: job, error: readError } = await supabase.from(table).select('id,org_id,status,attempts,max_attempts').eq('id', target.id).maybeSingle()
      if (readError || !job) return NextResponse.json({ success: false, error: 'İş bulunamadı' }, { status: 404 })
      if (!expected.includes(job.status)) return NextResponse.json({ success: false, error: `İş ${job.status} durumunda; işlem reddedildi` }, { status: 409 })
      if (isRetry && job.attempts >= job.max_attempts) return NextResponse.json({ success: false, error: 'Maksimum retry sayısına ulaşıldı' }, { status: 409 })
      const { error } = await supabase.from(table).update({
        status: isRetry ? 'pending' : 'cancelled',
        claimed_by: null,
        claimed_at: null,
        finished_at: isRetry ? null : new Date().toISOString(),
        error: isRetry ? null : 'Operator cancelled queued job',
        updated_at: new Date().toISOString(),
      }).eq('id', target.id).in('status', expected)
      if (error) throw error
      await recordOperatorEvent({
        eventType: isRetry ? 'JOB_RETRY_REQUESTED' : 'JOB_CANCELLED',
        jobId: `${table}:${target.id}`, orgId: job.org_id,
        state: isRetry ? 'QUEUED' : 'CANCELLED',
        message: isRetry ? 'Operatör işi yeniden kuyruğa aldı' : 'Operatör kuyruktaki işi iptal etti',
        payload: { operator_action: true, source: table },
      })
      return NextResponse.json({ success: true, message: isRetry ? 'İş yeniden kuyruğa alındı' : 'Kuyruktaki iş iptal edildi' })
    }

    if (!['flow', 'gemini'].includes(target.source)) {
      return NextResponse.json({ success: false, error: 'Hesap işlemi yalnız yönetilen provider hesaplarında kullanılabilir' }, { status: 400 })
    }

    if (target.source === 'flow') {
      const { data: account, error: readError } = await supabase.from('flow_accounts').select('id,status,current_job_id').eq('id', target.id).maybeSingle()
      if (readError || !account) return NextResponse.json({ success: false, error: 'Flow hesabı bulunamadı' }, { status: 404 })
      if (account.current_job_id) return NextResponse.json({ success: false, error: 'Aktif işi olan hesap değiştirilemez' }, { status: 409 })
      let nextStatus = account.status
      if (action === 'disable_account') nextStatus = 'maintenance'
      else if (action === 'enable_account') nextStatus = 'idle'
      else if (action === 'clear_account_cooldown' && ['cooling_down', 'rate_limited'].includes(account.status)) nextStatus = 'idle'
      else return NextResponse.json({ success: false, error: 'Bu hesap durumu için işlem uygulanamaz' }, { status: 409 })
      const { error } = await supabase.from('flow_accounts').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', target.id).eq('status', account.status).is('current_job_id', null)
      if (error) throw error
      await recordOperatorEvent({ eventType: 'ACCOUNT_STATE_CHANGED', accountId: target.id, state: nextStatus, message: `${target.id} hesabı ${nextStatus} durumuna alındı`, payload: { operator_action: true } })
      return NextResponse.json({ success: true, message: `Hesap durumu: ${nextStatus}` })
    }

    const port = Number(target.id)
    if (!Number.isInteger(port) || port < 9222 || port > 9240 || action !== 'clear_account_cooldown') {
      return NextResponse.json({ success: false, error: 'Gemini için yalnız güvenli cooldown temizleme destekleniyor' }, { status: 409 })
    }
    const gatewayUrl = process.env.AI_GATEWAY_URL
    if (!gatewayUrl) return NextResponse.json({ success: false, error: 'AI_GATEWAY_URL yapılandırılmamış' }, { status: 503 })
    const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/v1/ai-engine/accounts/reset-limit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port }),
      signal: AbortSignal.timeout(5_000),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return NextResponse.json({ success: false, error: result.error || 'Gateway işlemi reddetti' }, { status: response.status })
    await recordOperatorEvent({ eventType: 'ACCOUNT_COOLDOWN_CLEARED', accountId: `gemini:${port}`, provider: undefined, message: `Gemini ${port} cooldown temizlendi`, payload: { operator_action: true } })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Operatör işlemi başarısız' }, { status: 500 })
  }
}
