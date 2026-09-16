import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { org, supabase } = await requireActiveOrg()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayIso = todayStart.toISOString()

    // 1. Hatlar
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, label, phone_e164, status, status_detail, is_locked, enabled, last_seen_at')
      .eq('org_id', org.id)
      .order('label', { ascending: true })

    // 2. Worker / VPS Durumu (wa schema)
    let workerHeartbeat: unknown = null
    try {
      const serviceClient = createSupabaseServiceClient()
      if (serviceClient) {
        const { data: hb } = await serviceClient
          .schema('wa')
          .from('worker_heartbeat')
          .select('worker_id, max_sessions, tracked, live, db_pool_max, seen_at, meta')
          .order('seen_at', { ascending: false })
          .limit(1)
        workerHeartbeat = hb?.[0] ?? null
      }
    } catch {
      // Schema read hatası genel akışı bozmamalı
    }

    // 3. İstatistikler (Bugün)
    const [inboundRes, outboundRes, aiLogRes, pendingJobsRes] = await Promise.all([
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'in')
        .gte('created_at', todayIso),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .gte('created_at', todayIso),
      supabase
        .from('auto_reply_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .gte('created_at', todayIso),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('status', 'pending'),
    ])

    // 4. Son Mesajlar (Gelen & Giden)
    const { data: messages } = await supabase
      .from('message_log')
      .select('id, direction, phone_e164, push_name, message_type, body, media_url, status, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(30)

    // 5. ChatGPT & Hazır Cevap Kütüphanesi Logları
    const { data: aiLibrary } = await supabase
      .from('ai_reply_suggestion_library')
      .select('id, incoming_sample, suggestions, source, hit_count, generated_count, last_used_at, created_at')
      .eq('org_id', org.id)
      .order('last_used_at', { ascending: false })
      .limit(20)

    // 6. Otomatik Cevap Gönderim Logları
    const { data: autoReplies } = await supabase
      .from('auto_reply_log')
      .select('id, phone_e164, source, reply_body, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // 7. Kuyruk İşleri
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, type, status, error, priority, created_at, started_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(15)

    return NextResponse.json({
      success: true,
      org: { id: org.id, name: org.name, auto_reply_enabled: org.auto_reply_enabled },
      accounts: accounts ?? [],
      worker: workerHeartbeat,
      summary: {
        todayInbound: inboundRes.count ?? 0,
        todayOutbound: outboundRes.count ?? 0,
        todayAiReplies: aiLogRes.count ?? 0,
        pendingJobs: pendingJobsRes.count ?? 0,
      },
      messages: messages ?? [],
      aiLibrary: aiLibrary ?? [],
      autoReplies: autoReplies ?? [],
      jobs: jobs ?? [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Veriler alınamadı' },
      { status: 500 },
    )
  }
}
