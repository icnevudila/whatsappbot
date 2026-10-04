import { NextRequest, NextResponse } from 'next/server'
import { videoFailureUserMessage } from '@/lib/creative/job-failure-message'
import { requireActiveOrg } from '@/lib/org'
import type { JobUserViewModel } from '@/app/(panel)/icerik/wizard-types'
import { mapEngineStateToStage } from '@/lib/creative/production-progress/stage-mapper'
import { calculateAuthoritativeEta } from '@/lib/creative/production-progress/eta-calculator'
import type { ProductionStageKey } from '@/lib/creative/production-progress/progress-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toLegacyDisplayState(key: ProductionStageKey): JobUserViewModel['display_state'] {
  switch (key) {
    case 'REQUEST_ACCEPTED':
      return 'REKLAM_TASLAGI_HAZIRLANIYOR'
    case 'QUEUED':
      return 'SIRAYA_ALINDI'
    case 'ASSETS_PREPARING':
      return 'GORSELLER_BAGLANIYOR'
    case 'GENERATING':
      return 'VIDEO_OLUSTURULUYOR'
    case 'MEDIA_PROCESSING':
      return 'VIDEO_OLUSTURULUYOR'
    case 'QUALITY_CHECK':
      return 'KALITE_KONTROLU'
    case 'READY':
      return 'HAZIR'
    case 'NEEDS_REVIEW':
      return 'INCELEME_GEREKIYOR'
    case 'FAILED':
      return 'BASARISIZ'
    default:
      return 'SIRAYA_ALINDI'
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

    // Authoritative Timing Calculation
    const now = Date.now()
    const jobStartedAt = job.created_at || null
    const jobStartTime = jobStartedAt ? new Date(jobStartedAt).getTime() : now
    const elapsedTotalSeconds = Math.max(0, Math.floor((now - jobStartTime) / 1000))

    // Find when current stage or state started from events
    let stageStartedAt: string | null = job.updated_at || jobStartedAt
    if (events && events.length > 0) {
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i]
        if (ev.to_state === job.state && ev.created_at) {
          stageStartedAt = ev.created_at
          break
        }
      }
    }
    const stageStartTime = stageStartedAt ? new Date(stageStartedAt).getTime() : now
    const stageElapsedSeconds = Math.max(0, Math.floor((now - stageStartTime) / 1000))

    // 3. Queue & Capacity Calculations
    let queueAheadCount: number | null = null

    if (job.state === 'QUEUED' || job.state === 'PENDING') {
      const { count } = await (supabase as any)
        .from('ai_media_jobs')
        .select('id', { count: 'exact', head: true })
        .in('state', ['QUEUED', 'LEASED', 'PREPARING_ENV', 'OPENING_PROJECT', 'ATTACHING_INGREDIENTS', 'INGREDIENTS_VERIFIED', 'GENERATING'])
        .lt('created_at', job.created_at)

      queueAheadCount = count ?? 0
    }

    // Dynamically discover worker concurrency (never hardcoded to 3)
    let dynamicCapacity = 1
    try {
      const { count: activeExecutingCount } = await (supabase as any)
        .from('ai_media_jobs')
        .select('id', { count: 'exact', head: true })
        .in('state', [
          'LEASED',
          'PREPARING_ENV',
          'OPENING_PROJECT',
          'ATTACHING_INGREDIENTS',
          'INGREDIENTS_VERIFIED',
          'GENERATING',
          'POLLING_FLOW',
          'DOWNLOADING_MEDIA',
          'MEDIA_DOWNLOADED',
          'FFPROBE_INSPECTING',
          'SHA256_VERIFYING',
          'VISUAL_QA_EVALUATING',
        ])

      dynamicCapacity = Math.max(1, activeExecutingCount || 1)
    } catch {
      dynamicCapacity = 1
    }

    // Historical duration sampling for data-driven ETA
    let historicalDurationsSeconds: number[] = []
    try {
      const { data: recentCompleted } = await (supabase as any)
        .from('ai_media_jobs')
        .select('created_at, updated_at')
        .eq('state', 'COMPLETED')
        .order('updated_at', { ascending: false })
        .limit(30)

      if (recentCompleted && recentCompleted.length > 0) {
        historicalDurationsSeconds = recentCompleted
          .map((j: any) => {
            const start = new Date(j.created_at).getTime()
            const end = new Date(j.updated_at).getTime()
            return (end - start) / 1000
          })
          .filter((d: number) => Number.isFinite(d) && d > 10 && d < 1800)
      }
    } catch (histErr) {
      console.warn('[ai-media-jobs] Warning fetching job duration history:', histErr)
    }

    // Map Engine State to Canonical Stage
    const stageMapping = mapEngineStateToStage(job.state)

    // Calculate Authoritative ETA
    const etaResult = calculateAuthoritativeEta({
      historicalDurationsSeconds,
      activeWorkerCapacity: dynamicCapacity,
      queueAheadCount,
      currentStageIndex: stageMapping.stage_index,
      elapsedTotalSeconds,
      isTerminal: stageMapping.is_terminal,
    })

    // 4. Fetch Output if completed
    let outputId: string | null = null
    let playbackUrl: string | null = null
    let outputEvidence: any = null

    if (job.state === 'COMPLETED' || job.state === 'NEEDS_REVIEW') {
      const { data: outputs } = await (supabase as any)
        .from('ai_media_outputs')
        .select('id, file_path, storage_url, sha256, duration_seconds, width, height, verified, is_approved, visual_qa_report')
        .eq('job_id', jobId)
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const output = outputs?.[0]
      if (output) {
        outputEvidence = output
        outputId = output.id
        // Approved output is directly playable. NEEDS_REVIEW output is also
        // served to the owning org so they can preview their video while it
        // awaits human review — it is not publicly publishable until approved.
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
              payload: {
                thumbnailUrl: playbackUrl ? `${playbackUrl}?thumb=1` : null,
                review_required: !output.is_approved,
              },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
        } catch (syncErr) {
          console.warn('[ai-media-jobs] Warning: Failed to sync creative completion:', syncErr)
        }
      }
    }

    const legacyDisplayState = toLegacyDisplayState(stageMapping.stage_key)

    const viewModel: JobUserViewModel = {
      job_id: job.id,
      org_id: job.org_id,
      state: job.state,
      raw_state: job.state,
      stage_key: stageMapping.stage_key,
      stage_count: stageMapping.stage_count,
      stage_index: stageMapping.stage_index,
      stage_started_at: stageStartedAt,
      job_started_at: jobStartedAt,
      elapsed_total_seconds: elapsedTotalSeconds,
      stage_elapsed_seconds: stageElapsedSeconds,
      detail_hint: stageMapping.detail_hint,
      display_state: legacyDisplayState,
      display_title: stageMapping.display_title,
      display_message: stageMapping.display_message,
      queue_ahead_count: queueAheadCount,
      eta_min_seconds: etaResult.eta_min_seconds,
      eta_max_seconds: etaResult.eta_max_seconds,
      eta_display_text: etaResult.eta_display_text,
      eta_confidence: etaResult.eta_confidence,
      progress_mode: stageMapping.progress_mode,
      can_cancel: ['PENDING', 'QUEUED'].includes(job.state),
      can_leave_page: true,
      output_id: outputId,
      playback_url: playbackUrl,
      failure_user_message: job.state === 'FAILED'
        ? videoFailureUserMessage(job.error_message)
        : job.state === 'NEEDS_REVIEW'
          ? 'Çıktı otomatik kalite kontrolünden geçmedi; yayınlanmadan önce insan incelemesi gerekiyor.'
          : null,
      creative_engine_mode: job.creative_engine_mode || job.metadata?.creative_engine_mode || null,
      requested_provider: job.requested_provider || job.metadata?.requested_provider || null,
      selected_provider: job.selected_provider || null,
      capability_state: job.capability_state || null,
      fallback_from: job.fallback_from || null,
      fallback_reason: job.fallback_reason || null,
      final_sha256: outputEvidence?.sha256 || null,
      duration_seconds: outputEvidence?.duration_seconds == null ? null : Number(outputEvidence.duration_seconds),
      width: outputEvidence?.width ?? null,
      height: outputEvidence?.height ?? null,
      output_verified: outputEvidence?.verified ?? null,
      output_approved: outputEvidence?.is_approved ?? null,
      fidelity_contract_applied: job.metadata?.fidelity_contract_applied ?? null,
      fidelity_rule_count: job.metadata?.fidelity_rule_count ?? null,
      canonical_asset_sha: job.metadata?.canonical_asset_sha ?? null,
      product_fidelity_contract: job.metadata?.product_fidelity_contract || job.metadata?.simple_v5_diagnostics?.product_fidelity_contract || null,
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
