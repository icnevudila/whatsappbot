import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim. Lütfen giriş yapın.' },
        { status: 401 },
      )
    }

    const serviceClient = createSupabaseServiceClient()
    if (!serviceClient) {
      return NextResponse.json(
        { success: false, error: 'Veritabanı servisi yapılandırılmamış.' },
        { status: 500 },
      )
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayIso = todayStart.toISOString()

    // 1. Hatlar (Tüm İşletmeler)
    const { data: rawAccounts } = await serviceClient
      .from('accounts')
      .select('id, label, phone_e164, status, status_detail, is_locked, enabled, last_seen_at, org_id, organizations(name)')
      .order('label', { ascending: true })

    const accounts = (rawAccounts || []).map((a: any) => ({
      id: a.id,
      label: a.label,
      phone_e164: a.phone_e164,
      status: a.status,
      status_detail: a.status_detail,
      is_locked: a.is_locked,
      enabled: a.enabled,
      last_seen_at: a.last_seen_at,
      org_id: a.org_id,
      org_name: a.organizations?.name || 'Genel',
    }))

    // 2. Worker / VPS Baileys Durumu (wa schema)
    let workerHeartbeat: unknown = null
    try {
      const { data: hb } = await serviceClient
        .schema('wa')
        .from('worker_heartbeat')
        .select('worker_id, max_sessions, tracked, live, db_pool_max, seen_at, meta')
        .order('seen_at', { ascending: false })
        .limit(1)
      workerHeartbeat = hb?.[0] ?? null
    } catch {
      // Schema read hatası genel akışı bozmamalı
    }

    // 3. Kampanyalar (Gönderilen & Bekleyenler)
    const { data: rawCampaigns } = await serviceClient
      .from('campaigns')
      .select('id, name, status, message_type, body, total_targets, sent_count, failed_count, skipped_count, created_at, started_at, paused_at, completed_at, wait_reason, org_id, organizations(name)')
      .order('created_at', { ascending: false })
      .limit(20)

    const campaigns = (rawCampaigns || []).map((c: any) => {
      const total = c.total_targets ?? 0
      const sent = c.sent_count ?? 0
      const failed = c.failed_count ?? 0
      const skipped = c.skipped_count ?? 0
      const pending = Math.max(0, total - (sent + failed + skipped))
      const progressPercent = total > 0 ? Math.round(((sent + failed + skipped) / total) * 100) : 0

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        message_type: c.message_type,
        body: c.body,
        total_targets: total,
        sent_count: sent,
        failed_count: failed,
        skipped_count: skipped,
        pending_count: pending,
        progress_percent: progressPercent,
        created_at: c.created_at,
        started_at: c.started_at,
        wait_reason: c.wait_reason,
        org_id: c.org_id,
        org_name: c.organizations?.name || '',
      }
    })

    // 4. Anlık Gönderilen & Sırada Olan Mesajlar (campaign_targets)
    const { data: rawTargets } = await serviceClient
      .from('campaign_targets')
      .select('id, campaign_id, phone_e164, status, personalized_body, scheduled_for, sent_at, error, created_at, campaigns(name), organizations(name)')
      .order('created_at', { ascending: false })
      .limit(60)

    const targets = (rawTargets || []).map((t: any) => ({
      id: t.id,
      campaign_id: t.campaign_id,
      campaign_name: t.campaigns?.name || 'Genel Kampanya',
      phone_e164: t.phone_e164,
      status: t.status, // queued, sent, delivered, read, failed, skipped
      personalized_body: t.personalized_body,
      scheduled_for: t.scheduled_for,
      sent_at: t.sent_at,
      error: t.error,
      created_at: t.created_at,
      org_name: t.organizations?.name || '',
    }))

    // 5. ChatGPT Görsel & Mesaj Üretim Sırası (creatives)
    const { data: rawCreatives } = await serviceClient
      .from('creatives')
      .select('id, title, template, format, status, public_url, error, created_at, updated_at, org_id, organizations(name)')
      .order('created_at', { ascending: false })
      .limit(25)

    const creatives = (rawCreatives || []).map((cr: any) => ({
      id: cr.id,
      title: cr.title || 'Başlıksız Görsel',
      template: cr.template,
      format: cr.format,
      status: cr.status, // pending, generating, ready, failed
      public_url: cr.public_url,
      error: cr.error,
      created_at: cr.created_at,
      org_name: cr.organizations?.name || '',
    }))

    // 6. Canlı Mesaj Akışı (Gelen & Giden)
    const { data: rawMessages } = await serviceClient
      .from('message_log')
      .select('id, direction, phone_e164, push_name, message_type, body, media_url, status, created_at, org_id, organizations(name)')
      .order('created_at', { ascending: false })
      .limit(50)

    const messages = (rawMessages || []).map((m: any) => ({
      id: m.id,
      direction: m.direction,
      phone_e164: m.phone_e164,
      push_name: m.push_name,
      message_type: m.message_type,
      body: m.body,
      media_url: m.media_url,
      status: m.status,
      created_at: m.created_at,
      org_name: m.organizations?.name || '',
    }))

    // 7. İş Kuyruğu (jobs)
    const { data: rawJobs } = await serviceClient
      .from('jobs')
      .select('id, type, status, error, priority, attempts, max_attempts, created_at, started_at, finished_at, org_id, organizations(name)')
      .order('created_at', { ascending: false })
      .limit(25)

    const jobs = (rawJobs || []).map((j: any) => ({
      id: j.id,
      type: j.type,
      status: j.status,
      error: j.error,
      priority: j.priority,
      attempts: j.attempts,
      max_attempts: j.max_attempts,
      created_at: j.created_at,
      started_at: j.started_at,
      finished_at: j.finished_at,
      org_name: j.organizations?.name || '',
    }))

    // 8. İstatistikler & Özet Sayaçlar
    const [inboundRes, outboundRes, queuedTargetsRes, pendingJobsRes] = await Promise.all([
      serviceClient
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'in')
        .gte('created_at', todayIso),
      serviceClient
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'out')
        .gte('created_at', todayIso),
      serviceClient
        .from('campaign_targets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'queued'),
      serviceClient
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'claimed', 'running']),
    ])

    return NextResponse.json({
      success: true,
      accounts: accounts ?? [],
      worker: workerHeartbeat,
      campaigns: campaigns ?? [],
      targets: targets ?? [],
      creatives: creatives ?? [],
      messages: messages ?? [],
      jobs: jobs ?? [],
      summary: {
        todayInbound: inboundRes.count ?? 0,
        todayOutbound: outboundRes.count ?? 0,
        queuedMessages: queuedTargetsRes.count ?? 0,
        pendingJobs: pendingJobsRes.count ?? 0,
        activeCampaigns: campaigns.filter((c: any) => c.status === 'running').length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Veriler alınamadı' },
      { status: 500 },
    )
  }
}
