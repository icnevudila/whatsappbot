import { NextRequest, NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import type { JobUserViewModel } from '@/app/(panel)/icerik/wizard-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Maps raw backend states to user-facing stages and friendly titles
 */
function mapEngineStateToStage(state: string): {
  stage_index: number
  display_state: JobUserViewModel['display_state']
  display_title: string
  display_message: string
} {
  switch (state) {
    case 'PENDING':
    case 'VALIDATING_INPUTS':
      return {
        stage_index: 1,
        display_state: 'REKLAM_TASLAGI_HAZIRLANIYOR',
        display_title: 'Reklam Taslağı Doğrulanıyor',
        display_message: 'Kurumsal kimlik ve onaylı metin kilitlendi.',
      }
    case 'QUEUED':
      return {
        stage_index: 2,
        display_state: 'SIRAYA_ALINDI',
        display_title: 'Video Sıraya Alındı',
        display_message: 'Prodüksiyon sırası bekleniyor.',
      }
    case 'LEASED':
    case 'PREPARING_ENV':
    case 'OPENING_PROJECT':
    case 'ATTACHING_INGREDIENTS':
    case 'INGREDIENTS_VERIFIED':
      return {
        stage_index: 3,
        display_state: 'GORSELLER_BAGLANIYOR',
        display_title: 'Görseller ve Materyaller Hazırlanıyor',
        display_message: 'Logonuz ve ürün fotoğraflarınız stüdyoya aktarılıyor.',
      }
    case 'GENERATING':
    case 'POLLING_FLOW':
    case 'DOWNLOADING_MEDIA':
    case 'MEDIA_DOWNLOADED':
      return {
        stage_index: 4,
        display_state: 'VIDEO_OLUSTURULUYOR',
        display_title: 'Reklam Videosu Hazırlanıyor',
        display_message: 'Sinematik sahneler ve kurgu işleniyor.',
      }
    case 'FFPROBE_INSPECTING':
    case 'SHA256_VERIFYING':
      return {
        stage_index: 5,
        display_state: 'KALITE_KONTROLU',
        display_title: 'Kalite Kontrolü Yapılıyor',
        display_message: 'Görsel netliği ve ses uyumu denetleniyor.',
      }
    case 'VISUAL_QA_EVALUATING':
      return {
        stage_index: 6,
        display_state: 'MARKA_DUZENLEMELERI',
        display_title: 'Logo ve Marka Kapanışı Ekleniyor',
        display_message: 'Kurumsal logonuz ve kapanış sahnesi kurgulanıyor.',
      }
    case 'COMPLETED':
      return {
        stage_index: 7,
        display_state: 'HAZIR',
        display_title: 'Videonuz Hazır!',
        display_message: 'Reklam videonuz başarıyla tamamlandı. Aşağıdan izleyebilirsiniz.',
      }
    case 'FAILED':
      return {
        stage_index: 0,
        display_state: 'BASARISIZ',
        display_title: 'Üretim Başarısız Oldu',
        display_message: 'Video üretilirken bir hata oluştu.',
      }
    default:
      return {
        stage_index: 2,
        display_state: 'SIRAYA_ALINDI',
        display_title: 'İşleniyor',
        display_message: 'İşlem devam ediyor.',
      }
  }
}

/**
 * GET /api/ai-media/jobs/[jobId]
 * Fetches canonical JobUserViewModel with authoritative server-side ETA & queue position.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json({ error: 'İş ID belirtilmedi.' }, { status: 400 })
    }

    // 1. Fetch Job
    const { data: job, error: jobError } = await (supabase as any)
      .from('ai_media_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Video işi bulunamadı.' }, { status: 404 })
    }

    // Tenant Isolation Fail-Closed Gate
    if (job.org_id !== org.id) {
      console.warn(`[SECURITY] Cross-tenant access attempt: auth org ${org.id} tried to read job ${job.id} (org ${job.org_id})`)
      return NextResponse.json({ error: 'Erişim yetkiniz yok.' }, { status: 403 })
    }

    // 2. Fetch Events Timeline
    const { data: events } = await (supabase as any)
      .from('ai_media_events')
      .select('event_type, to_state, message, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })

    // 3. Queue & ETA Calculations
    let queueAheadCount: number | null = null
    let etaDisplayText: string | null = null

    if (job.state === 'QUEUED' || job.state === 'PENDING') {
      const { count } = await (supabase as any)
        .from('ai_media_jobs')
        .select('id', { count: 'exact', head: true })
        .in('state', ['QUEUED', 'LEASED'])
        .lt('created_at', job.created_at)

      const currentAhead = count ?? 0
      queueAheadCount = currentAhead
      const estimatedSecs = 90 + (currentAhead * 75)
      const minMins = Math.max(1, Math.floor(estimatedSecs / 60))
      const maxMins = minMins + 1
      etaDisplayText = `yaklaşık ${minMins}–${maxMins} dakika`
    } else if (['LEASED', 'PREPARING_ENV', 'OPENING_PROJECT', 'ATTACHING_INGREDIENTS', 'INGREDIENTS_VERIFIED', 'GENERATING'].includes(job.state)) {
      etaDisplayText = 'yaklaşık 1–2 dakika'
    } else if (['FFPROBE_INSPECTING', 'SHA256_VERIFYING', 'VISUAL_QA_EVALUATING'].includes(job.state)) {
      etaDisplayText = 'yaklaşık 30 saniye'
    } else if (job.state === 'COMPLETED') {
      etaDisplayText = 'Tamamlandı'
    }

    // 4. Fetch Output if completed
    let outputId: string | null = null
    let playbackUrl: string | null = null

    if (job.state === 'COMPLETED') {
      const { data: outputs } = await (supabase as any)
        .from('ai_media_outputs')
        .select('id, file_path, storage_url, verified, is_approved')
        .eq('job_id', jobId)
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const output = outputs?.[0]
      if (output) {
        outputId = output.id
        // Deliver authorized media stream endpoint
        playbackUrl = `/api/ai-media/outputs/${output.id}`

        // Ensure creatives table is synced so video appears ready in Content Library
        try {
          const creatorId = (job.metadata as any)?.created_by_user_id || (org as any).created_by || null
          await (supabase as any)
            .from('creatives')
            .upsert({
              id: jobId,
              org_id: org.id,
              created_by: creatorId,
              title: job.title || 'Kampanya Videosu',
              format: 'video',
              status: 'ready',
              source: 'ai',
              public_url: playbackUrl,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
        } catch (syncErr) {
          console.warn('[ai-media-jobs] Warning: Failed to sync creative completion:', syncErr)
        }
      }
    }

    const { stage_index, display_state, display_title, display_message } = mapEngineStateToStage(job.state)

    const viewModel: JobUserViewModel = {
      job_id: job.id,
      org_id: job.org_id,
      state: job.state,
      display_state,
      display_title,
      display_message,
      stage_index,
      queue_ahead_count: queueAheadCount,
      eta_display_text: etaDisplayText,
      can_cancel: ['PENDING', 'QUEUED'].includes(job.state),
      can_leave_page: true,
      output_id: outputId,
      playback_url: playbackUrl,
      failure_user_message: job.state === 'FAILED' ? (job.error_message || 'Video işlenirken bir hata oluştu.') : null,
    }

    return NextResponse.json({
      job: viewModel,
      events: events || [],
    })
  } catch (error: any) {
    console.error('[ai-media-jobs] Job detail error:', error)
    return NextResponse.json({ error: error?.message || 'Sunucu hatası.' }, { status: 500 })
  }
}
