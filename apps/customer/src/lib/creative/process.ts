import type { SupabaseClient } from '@supabase/supabase-js'
import { DirectImageReconciliationError, generateImage, type ReferenceImage } from '@/lib/ai/image'
import { inspectImageOutput } from '@/lib/ai/image-output'
import { verifyPersistedImageBytes } from '@/lib/ai/image-storage-contract'
import { ImageJobFailedError, ImageJobPendingError, ImageJobReconciliationError, ImageSubmissionUncertainError, readImageJob } from '@/lib/ai/omnistudio-image-job'
import { createHash } from 'node:crypto'
import type { AiKeyBag } from '@/lib/ai/config'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { buildCreativePrompt, buildVideoPrompt, deriveVerifiedCampaignData } from './prompt'
import { generateCampaignWhatsAppMessage } from '@/lib/ai/campaign-message'
import { formatToAspect, type CreativePayload, type CreativeSnapshot } from './types'
import { createVideoGenerationIdentity } from './video-generation-identity'
import { submitVideoWithIntent, VideoJobTerminalError, VideoSubmissionUncertainError } from './video-submit-job'
import { resolveAssetSource } from './asset-source-resolver'
import { compositeCommercialCreative } from './v2/image-compositor'
import { buildImagePromptV2 } from './v2/image-prompt-v2'
import { mapLegacyStyleToPreset } from './v2/adapter'
import { imagePublicationStatus } from './image-review'
import type { ImageFormatV2 } from './v2/types'

const MAX_REFS = 4

function asSnapshot(payload: unknown): CreativeSnapshot | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const row = payload as CreativePayload
  if (!row.brief || !row.aspect) return null
  return {
    ...row,
    products: Array.isArray(row.products) ? row.products : [],
    phones: Array.isArray(row.phones) ? row.phones : [],
    socials: Array.isArray(row.socials) ? row.socials : [],
    labels: Array.isArray(row.labels) ? row.labels : [],
  }
}

async function fetchBuffer(url: string): Promise<ReferenceImage | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) return null
    const mime = response.headers.get('content-type') || 'image/png'
    if (!mime.startsWith('image/')) return null
    const data = Buffer.from(await response.arrayBuffer())
    if (data.length < 32) return null
    return { data, mimeType: mime.split(';')[0] }
  } catch {
    return null
  }
}

const STALE_RENDER_MS = 3 * 60 * 1000
const FLOW_POLL_RETRY_SECONDS = 3

export type VideoProgressInfo = {
  elapsedSeconds: number
  remainingSeconds: number
  progressPercent: number
  stage: string
  stageLabel: string
  stageDetail: string
}

export function computeVideoProgress(
  flowJob?: { queuedAt?: string | null; queuePosition?: number | null } | null,
  jobStatus?: { status?: string; queue_position?: number; startedAt?: number; elapsed_seconds?: number } | null,
  fallbackCreatedAt?: string | null,
): VideoProgressInfo {
  const now = Date.now()
  let elapsed = 0

  if (typeof jobStatus?.elapsed_seconds === 'number' && jobStatus.elapsed_seconds >= 0) {
    elapsed = jobStatus.elapsed_seconds
  } else if (jobStatus?.startedAt) {
    elapsed = Math.max(0, Math.floor((now - jobStatus.startedAt) / 1000))
  } else if (flowJob?.queuedAt) {
    elapsed = Math.max(0, Math.floor((now - new Date(flowJob.queuedAt).getTime()) / 1000))
  } else if (fallbackCreatedAt) {
    elapsed = Math.max(0, Math.floor((now - new Date(fallbackCreatedAt).getTime()) / 1000))
  }

  const queuePos = jobStatus?.queue_position ?? flowJob?.queuePosition ?? 0
  const isQueued = jobStatus?.status === 'queued' || (!jobStatus?.startedAt && queuePos > 0)

  if (isQueued && queuePos > 0) {
    const queueWait = queuePos * 120
    const remaining = Math.max(5, queueWait + 122 - elapsed)
    return {
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      progressPercent: Math.min(10, Math.floor((elapsed / (queueWait + 122)) * 10)),
      stage: 'queued',
      stageLabel: 'Önceki video tamamlanıyor, kuyrukta sıra bekleniyor…',
      stageDetail: `Kuyruk sıranız: ${queuePos} · Yaklaşık ${queueWait} sn sonra başlayacak`,
    }
  }

  const TOTAL_TARGET_SECONDS = 122

  if (elapsed < 16) {
    const remaining = Math.max(1, TOTAL_TARGET_SECONDS - elapsed)
    return {
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      progressPercent: Math.min(15, Math.floor((elapsed / 16) * 15)),
      stage: 'preparing',
      stageLabel: 'Senaryo ve görsel kompozisyon planlanıyor…',
      stageDetail: 'Marka kimliği, ürün açıları ve seslendirme metni kurgulanıyor',
    }
  }

  if (elapsed < 32) {
    const remaining = Math.max(1, TOTAL_TARGET_SECONDS - elapsed)
    return {
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      progressPercent: Math.min(28, 15 + Math.floor(((elapsed - 16) / 16) * 13)),
      stage: 'attaching_assets',
      stageLabel: 'Google Veo AI video motoru başlatılıyor…',
      stageDetail: 'Kurumsal logo ve ürün görseli sinematik sahneye bağlanıyor',
    }
  }

  if (elapsed < 98) {
    const remaining = Math.max(1, TOTAL_TARGET_SECONDS - elapsed)
    const veoRatio = (elapsed - 32) / 66
    return {
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      progressPercent: Math.min(78, 28 + Math.floor(veoRatio * 50)),
      stage: 'veo_rendering',
      stageLabel: 'Bulut GPU üzerinde sinematik render işleniyor…',
      stageDetail: 'Yüksek kaliteli yapay zeka video karesi üretiliyor (~65 sn)',
    }
  }

  if (elapsed < 108) {
    const remaining = Math.max(1, TOTAL_TARGET_SECONDS - elapsed)
    return {
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      progressPercent: Math.min(88, 78 + Math.floor(((elapsed - 98) / 10) * 10)),
      stage: 'downloading',
      stageLabel: 'Video indiriliyor ve doğrulanıyor…',
      stageDetail: 'Yüksek çözünürlüklü video karesi işleme sunucusundan alınıyor',
    }
  }

  if (elapsed < 122) {
    const remaining = Math.max(1, TOTAL_TARGET_SECONDS - elapsed)
    return {
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      progressPercent: Math.min(98, 88 + Math.floor(((elapsed - 108) / 14) * 10)),
      stage: 'subtitling',
      stageLabel: 'CapCut neon altyazıları ve ses miksajı senkronlanıyor…',
      stageDetail: 'Spiker seslendirmesi ve CapCut altyazı katmanı videoya işleniyor',
    }
  }

  return {
    elapsedSeconds: elapsed,
    remainingSeconds: 0,
    progressPercent: 99,
    stage: 'finalizing',
    stageLabel: 'Video kütüphanenize aktarılıyor…',
    stageDetail: 'Son kontroller yapılıyor, video yükleniyor…',
  }
}

type FlowJobState = NonNullable<CreativePayload['flowJob']>

function defaultGatewayUrl(): string {
  return (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')
}

/** Eski kayıtlardaki jobId alanını da okuyarak yarım kalmış işleri kurtarır. */
function readFlowJob(payload: CreativePayload): FlowJobState | null {
  const current = payload.flowJob
  if (current?.id && current.gatewayUrl) return current

  const legacyId = (payload as CreativePayload & { jobId?: unknown }).jobId
  if (typeof legacyId !== 'string' || !legacyId.trim()) return null
  return {
    id: legacyId,
    gatewayUrl: defaultGatewayUrl(),
    queuedAt: new Date().toISOString(),
    queuePosition: typeof (payload as CreativePayload & { queuePosition?: unknown }).queuePosition === 'number'
      ? (payload as CreativePayload & { queuePosition: number }).queuePosition
      : null,
    estimatedWaitSeconds:
      typeof (payload as CreativePayload & { estimatedWaitSeconds?: unknown }).estimatedWaitSeconds === 'number'
        ? (payload as CreativePayload & { estimatedWaitSeconds: number }).estimatedWaitSeconds
        : null,
  }
}

function readVideoResult(value: unknown): {
  videoUrl: string | null
  cleanVideoUrl: string | null
  thumbnailUrl: string | null
  flowProjectId: string | null
  flowProjectUrl: string | null
  sha256: string | null
} {
  const result = value && typeof value === 'object' && 'result' in value
    ? (value as { result?: unknown }).result
    : value
  const row = result && typeof result === 'object' ? result as Record<string, unknown> : {}
  const first = Array.isArray(row.data) && row.data[0] && typeof row.data[0] === 'object'
    ? row.data[0] as Record<string, unknown>
    : {}
  const stringValue = (input: unknown) => typeof input === 'string' && input.trim() ? input : null

  return {
    videoUrl: stringValue(first.url) || stringValue(row.videoUrl),
    cleanVideoUrl: stringValue(first.cleanUrl) || stringValue(row.cleanVideoUrl),
    thumbnailUrl: stringValue(first.thumbnailUrl) || stringValue(row.thumbnailUrl),
    flowProjectId: stringValue(row.flowProjectId) || stringValue(first.flowProjectId),
    flowProjectUrl: stringValue(row.flowProjectUrl) || stringValue(first.flowProjectUrl),
    sha256: stringValue(row.sha256) || stringValue(first.sha256),
  }
}

export async function processCreativeGeneration(
  creativeId: string,
  client?: SupabaseClient | null,
): Promise<{
  ok: boolean
  skipped?: boolean
  busy?: boolean
  pending?: boolean
  ready?: boolean
  needsReview?: boolean
  publicUrl?: string | null
  thumbnailUrl?: string | null
  retryAfterSeconds?: number
  error?: string
  progressInfo?: VideoProgressInfo | null
}> {
  const supabase = client || createSupabaseServiceClient()
  if (!supabase) {
    console.error('[creative.generate] istemci yok', creativeId)
    return {
      ok: false,
      error: 'Görsel üretimi başlatılamadı. Sayfayı açık tutup tekrar deneyin.',
    }
  }

  const { data: creative } = await supabase
    .from('creatives')
    .select(
      'id, org_id, template, status, error, payload, format, brand_kit_id, parent_id, storage_path, public_url, created_at, updated_at',
    )
    .eq('id', creativeId)
    .maybeSingle()

  if (!creative) return { ok: false, error: 'Kayıt bulunamadı.' }

  const snapshot = asSnapshot(creative.payload)
  if (!snapshot) {
    if (creative.format === 'video' || Boolean((creative.payload as any)?.job_id)) {
      return { ok: true, pending: true, retryAfterSeconds: 5 }
    }
    await supabase
      .from('creatives')
      .update({ status: 'failed', error: 'Üretim özeti eksik.' })
      .eq('id', creativeId)
    return { ok: false, error: 'Üretim özeti eksik.' }
  }

  const payload = snapshot as CreativePayload
  const isVideo = creative.format === 'video' || snapshot.formatId === 'reels_video'
  if (!isVideo && creative.status === 'failed' && !payload.imageJob && !payload.imageSubmitIntent && !payload.imageDirectIntent) {
    return { ok: false, error: creative.error || 'Önceki üretim başarısız; takip isteği yeni ücretli üretim başlatmaz.' }
  }

  if (!isVideo && creative.status === 'needs_review' && creative.public_url) {
    return { ok: true, skipped: true, ready: false, needsReview: true, publicUrl: creative.public_url }
  }

  if (creative.status === 'ready' && creative.public_url) {
    return {
      ok: true,
      skipped: true,
      ready: true,
      publicUrl: creative.public_url,
      thumbnailUrl: (creative.payload as any)?.thumbnailUrl || null,
    }
  }

  if (isVideo && creative.status === 'failed' && payload.videoSubmitIntent) {
    return { ok: false, error: creative.error || 'Önceki video üretimi başarısız; yeniden üretim yeni açık kullanıcı onayı gerektirir.' }
  }

  // Reconcile a frozen request before reading assets or recompiling a prompt. Retry must
  // never silently replace the approved script, references, options, or generation key.
  if (isVideo && payload.videoSubmitIntent && !readFlowJob(payload) && !payload.pendingVideoUrl) {
    const intent = payload.videoSubmitIntent
    if (intent.body.orgId !== creative.org_id || intent.body.creativeId !== creativeId ||
      intent.body.idempotencyKey !== intent.idempotencyKey) return { ok: false, error: 'VIDEO_SUBMIT_INTENT_IDENTITY_MISMATCH' }
    let expectedUpdatedAt = creative.updated_at
    try {
      const receipt = await submitVideoWithIntent(intent, async frozen => {
        const persisted = await supabase.from('creatives').update({ status: 'rendering',
          payload: { ...payload, videoSubmitIntent: frozen, videoSubmissionUncertain: true } })
          .eq('id', creativeId).eq('org_id', creative.org_id).eq('status', creative.status)
          .eq('updated_at', expectedUpdatedAt).select('id,updated_at').maybeSingle()
        if (persisted.error || persisted.data?.id !== creativeId) throw new Error('VIDEO_SUBMIT_INTENT_PERSISTENCE_FAILED')
        expectedUpdatedAt = persisted.data.updated_at
      }, true)
      const saved = await supabase.from('creatives').update({ status: 'rendering', error: null,
        payload: { ...payload, videoSubmissionUncertain: false, flowJob: { id: String(receipt.job_id),
          gatewayUrl: intent.gatewayUrl, queuedAt: intent.startedAt, lastStatus: receipt.status || 'queued' } } })
        .eq('id', creativeId).eq('org_id', creative.org_id).eq('updated_at', expectedUpdatedAt)
        .select('id').maybeSingle()
      if (saved.error || saved.data?.id !== creativeId) return { ok: true, pending: true, retryAfterSeconds: 10 }
      return { ok: true, pending: true, retryAfterSeconds: FLOW_POLL_RETRY_SECONDS }
    } catch (error) {
      if (error instanceof VideoJobTerminalError) {
        await supabase.from('creatives').update({ status: 'failed', error: `${error.code}: ${error.message}`.slice(0, 400),
          payload: { ...payload, videoSubmissionUncertain: false } })
          .eq('id', creativeId).eq('org_id', creative.org_id).eq('updated_at', expectedUpdatedAt)
        return { ok: false, error: error.message }
      }
      return { ok: true, pending: true, retryAfterSeconds: 10 }
    }
  }

  if (!isVideo && payload.imageDirectIntent) {
    const intent = payload.imageDirectIntent
    try {
      if (!intent.storagePath.startsWith(`${creative.org_id}/${creative.id}/direct-`) || !intent.requestId) throw new Error('Ham çıktı sahipliği doğrulanamadı.')
      // Only an actually stored artifact can resume. Missing/uncertain bytes never regenerate.
      const raw = await supabase.storage.from('creatives').download(intent.storagePath)
      if (raw.error || !raw.data) {
        if (creative.status === 'rendering' && Date.now() - new Date(intent.startedAt).getTime() < 180000) return { ok: true, pending: true, retryAfterSeconds: 10 }
        throw new Error('Kalıcı ham görsel bulunamadı; sağlayıcı sonucu uzlaştırılmalı.')
      }
      const bytes = Buffer.from(await raw.data.arrayBuffer())
      const measured = await inspectImageOutput(bytes)
      const publicResult = supabase.storage.from('creatives').getPublicUrl(intent.storagePath)
      const saved = await supabase.from('creatives').update({ status: 'ready', error: null,
        storage_path: intent.storagePath, public_url: publicResult.data.publicUrl,
        width: measured.width, height: measured.height,
        payload: { ...payload, imageDirectIntent: null, imageSubmitIntent: null, imageSubmissionUncertain: false, imageReconciliationRequired: false, provider: intent.provider,
          outputSha256: createHash('sha256').update(bytes).digest('hex') },
      }).eq('id', creativeId).eq('org_id', creative.org_id)
        .eq('payload->imageDirectIntent->>requestId', intent.requestId).select('id').maybeSingle()
      if (saved.error || saved.data?.id !== creativeId) return { ok: true, pending: true, retryAfterSeconds: 10 }
      return { ok: true, ready: true, publicUrl: publicResult.data.publicUrl }
    } catch {
      await supabase.from('creatives').update({ error: 'Üretim sonucu uzlaştırılmalı; ikinci ücretli üretim başlatılmadı.',
        payload: { ...payload, imageReconciliationRequired: true },
      }).eq('id', creativeId).eq('org_id', creative.org_id)
        .eq('payload->imageDirectIntent->>requestId', intent.requestId)
      return { ok: false, error: 'Üretim sonucu uzlaştırılmalı; ikinci ücretli üretim başlatılmadı.' }
    }
  }

  // Flow işi HTTP isteğinin ömründen uzundur. Job kimliği DB'de tutulur ve her
  // servis turunda yalnızca bir kez sorgulanır; uzun kuyrukta isteği açık tutmayız.
  if (!isVideo && payload.imageJob) {
    try {
      const image = await readImageJob(payload.imageJob, creative.org_id)
      if (!image) return { ok: true, pending: true, retryAfterSeconds: 5 }
      const ext = image.mimeType === 'image/jpeg' ? 'jpg' : image.mimeType === 'image/webp' ? 'webp' : 'png'
      // Stable storage identity: concurrent polls and upload retries reuse the same bytes, never another render.
      const storagePath = `${creative.org_id}/${creative.id}/${payload.imageJob.id}.${ext}`
      const upload = await supabase.storage.from('creatives').upload(storagePath, image.data, { contentType: image.mimeType, upsert: true })
      if (upload.error) return { ok: true, pending: true, retryAfterSeconds: 10, error: upload.error.message }
      const readback = await supabase.storage.from('creatives').download(storagePath)
      if (readback.error || !readback.data || readback.data.size > 32 * 1024 * 1024) return { ok: true, pending: true, retryAfterSeconds: 10 }
      const storedReceipt = await verifyPersistedImageBytes(image.data, Buffer.from(await readback.data.arrayBuffer()))
      const { data: url } = supabase.storage.from('creatives').getPublicUrl(storagePath)
      const update = await supabase.from('creatives').update({
        status: imagePublicationStatus(payload), error: null, storage_path: storagePath, public_url: url.publicUrl,
        width: image.width || null, height: image.height || null,
        payload: { ...payload, lastImageJob: payload.imageJob, imageJob: null, provider: 'omnistudio', outputSha256: storedReceipt.sha256,
          campaignMessage: payload.campaignMessage || (asSnapshot(payload) ? generateCampaignWhatsAppMessage(deriveVerifiedCampaignData(asSnapshot(payload)!)) : null),
          imageOutputReceipt: {orgId:creative.org_id,creativeId,jobId:payload.imageJob.id,sha256:storedReceipt.sha256,size:storedReceipt.size,
            mimeType:storedReceipt.mimeType,width:storedReceipt.width,height:storedReceipt.height,decodedImage:true,storagePath,
            referenceReceipt:image.referenceReceipt || null}, cost: { provider: 'omnistudio', imageCount: 1 } },
      }).eq('id', creativeId).eq('org_id', creative.org_id).in('status',['rendering','failed']).eq('payload->imageJob->>id', payload.imageJob.id).select('id').maybeSingle()
      if (update.error) return { ok: true, pending: true, retryAfterSeconds: 10, error: update.error.message }
      if (update.data?.id !== creativeId) return { ok: true, pending: true, retryAfterSeconds: 5 }
      return { ok: true, ready: imagePublicationStatus(payload) === 'ready', needsReview: imagePublicationStatus(payload) === 'needs_review', publicUrl: url.publicUrl }
    } catch (error) {
      if (error instanceof ImageJobReconciliationError) {
        const reconciliationMsg = 'Üretim durumu doğrulanamıyor, işlem inceleniyor. Çift ücretli üretim başlatılmadı.'
        await supabase.from('creatives').update({
          status: 'failed',
          error: reconciliationMsg,
          payload: {
            ...payload,
            imageReconciliationRequired: true,
            lastImageJob: payload.imageJob,
            imageTerminalFailure: { kind: 'RECONCILIATION_REQUIRED', jobId: payload.imageJob.id, gatewayUrl: payload.imageJob.gatewayUrl, queuedAt: payload.imageJob.queuedAt, error: reconciliationMsg },
            imageJob: null,
          },
        }).eq('id', creativeId).eq('org_id', creative.org_id)
        return {
          ok: false,
          pending: false,
          error: reconciliationMsg,
          progressInfo: {
            elapsedSeconds: Math.max(0, Math.floor((Date.now() - Date.parse(payload.imageJob.queuedAt)) / 1000)) || 0,
            remainingSeconds: 0,
            progressPercent: 0,
            stage: 'reconciliation',
            stageLabel: 'Üretim durumu doğrulanamıyor',
            stageDetail: 'İşlem inceleniyor. Çift üretim başlatılmadı; mevcut iş kontrol edilmeli.',
          },
        }
      }
      if (error instanceof ImageJobFailedError) {
        const message = error.message.slice(0, 400)
        await supabase.from('creatives').update({
          status: 'failed',
          error: message,
          payload: {
            ...payload,
            lastImageJob: payload.imageJob,
            imageTerminalFailure: { kind: 'PROVIDER_FAILED', jobId: payload.imageJob.id, gatewayUrl: payload.imageJob.gatewayUrl, error: message },
            imageSubmissionUncertain: false,
            imageJob: null,
          },
        }).eq('id', creativeId).eq('org_id', creative.org_id)
        return { ok: false, error: message }
      }
      const queuedMs = Date.parse(payload.imageJob.queuedAt) || 0
      const elapsedMs = queuedMs > 0 ? Date.now() - queuedMs : 0
      if (elapsedMs > 5 * 60 * 1000) {
        const timeoutMsg = 'Görsel üretimi zaman aşımına uğradı (5 dakika). Sonuç doğrulanamadı; işlem inceleniyor.'
        await supabase.from('creatives').update({
          status: 'failed',
          error: timeoutMsg,
          payload: {
            ...payload,
            imageReconciliationRequired: true,
            lastImageJob: payload.imageJob,
            imageTerminalFailure: { kind: 'TIMEOUT_RECONCILIATION_REQUIRED', jobId: payload.imageJob.id, gatewayUrl: payload.imageJob.gatewayUrl, queuedAt: payload.imageJob.queuedAt, error: timeoutMsg },
            imageJob: null,
          },
        }).eq('id', creativeId).eq('org_id', creative.org_id)
        return { ok: false, pending: false, error: timeoutMsg }
      }
      return { ok: true, pending: true, retryAfterSeconds: 5 }
    }
  }

  if (creative.status === 'rendering' && isVideo) {
    const flowJob = readFlowJob(payload)
    if (flowJob && !payload.pendingVideoUrl) {
      try {
        const response = await fetch(`${flowJob.gatewayUrl}/v1/videos/status/${encodeURIComponent(flowJob.id)}`, {
          signal: AbortSignal.timeout(12_000),
        })
        if (response.status === 404) {
          if (payload.videoSubmitIntent) {
            const saved = await supabase.from('creatives').update({ payload: { ...payload, flowJob: null, videoSubmissionUncertain: true } })
              .eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering')
              .eq('updated_at', creative.updated_at).select('id').maybeSingle()
            if (saved.data?.id === creativeId) return processCreativeGeneration(creativeId, supabase)
            return { ok: true, pending: true, retryAfterSeconds: 10 }
          }
          const message = 'Flow video görevi bulunamadı. Gateway yeniden başlamış olabilir; tekrar deneyin.'
          await supabase
            .from('creatives')
            .update({ status: 'failed', error: message })
            .eq('id', creativeId)
            .eq('status', 'rendering')
          return { ok: false, error: message }
        }
        if (!response.ok) {
          const progressInfo = computeVideoProgress(flowJob, null, creative.created_at)
          return { ok: true, pending: true, retryAfterSeconds: FLOW_POLL_RETRY_SECONDS, progressInfo }
        }

        const jobStatus = (await response.json()) as { status?: string; error?: string }
        if (jobStatus.status === 'failed') {
          const message = jobStatus.error || 'Video üretimi başarısız oldu.'
          await supabase
            .from('creatives')
            .update({ status: 'failed', error: message.slice(0, 400) })
            .eq('id', creativeId)
            .eq('status', 'rendering')
          return { ok: false, error: message }
        }

        if (jobStatus.status === 'completed') {
          const completed = readVideoResult(jobStatus)
          if (!completed.videoUrl) {
            const message = 'Flow görevi tamamlandı ancak video URL\'si dönmedi.'
            await supabase
              .from('creatives')
              .update({ status: 'failed', error: message })
              .eq('id', creativeId)
              .eq('status', 'rendering')
            return { ok: false, error: message }
          }
          // Doğrudan ready'ye geçir — pending'e alıp tekrar pipeline'dan geçirme.
          const { error: readyError } = await supabase
            .from('creatives')
            .update({
              status: 'ready',
              error: null,
              public_url: completed.videoUrl,
              storage_path: `external/${crypto.randomUUID()}.mp4`,
              width: 720,
              height: 1280,
              payload: {
                ...payload,
                flowJob: null,
                pendingVideoUrl: null,
                cleanPublicUrl: completed.cleanVideoUrl,
                thumbnailUrl: completed.thumbnailUrl,
                provider: 'omnistudio_veo',
                cost: { provider: 'omnistudio_veo', imageCount: 1 },
                flowProjectId: completed.flowProjectId || null,
                flowProjectUrl: completed.flowProjectUrl || null,
                sha256: completed.sha256 || null,
              },
            })
            .eq('id', creativeId)
            .eq('status', 'rendering')
          if (readyError) return { ok: false, error: readyError.message }
          return {
            ok: true,
            ready: true,
            publicUrl: completed.videoUrl,
            thumbnailUrl: completed.thumbnailUrl,
          }
        }

        await supabase
          .from('creatives')
          .update({
            payload: {
              ...payload,
              flowJob: {
                ...flowJob,
                lastStatus: jobStatus.status || 'queued',
                lastCheckedAt: new Date().toISOString(),
              },
            },
          })
          .eq('id', creativeId)
          .eq('status', 'rendering')
        const progressInfo = computeVideoProgress(flowJob, jobStatus, creative.created_at)
        return { ok: true, pending: true, retryAfterSeconds: FLOW_POLL_RETRY_SECONDS, progressInfo }
      } catch (error) {
        console.warn('[creative.video.poll]', creativeId, error)
        const progressInfo = computeVideoProgress(flowJob, null, creative.created_at)
        return { ok: true, pending: true, retryAfterSeconds: FLOW_POLL_RETRY_SECONDS, progressInfo }
      }
    }

    // Eski akış indirme sırasında kesilmiş olabilir. Flow’u yeniden çalıştırmak
    // yerine, kayıtlı çıktı URL’sinden devam eder.
    if (payload.pendingVideoUrl) {
      const { error: resumeError } = await supabase
        .from('creatives')
        .update({ status: 'pending', error: null })
        .eq('id', creativeId)
        .eq('status', 'rendering')
      if (resumeError) return { ok: false, error: resumeError.message }
      return processCreativeGeneration(creativeId, supabase)
    }
  }

  if (!isVideo && creative.status === 'rendering' && (payload.imageSubmissionUncertain || payload.imageSubmitIntent)) {
    // Recover only with the same durable idempotency key; this is not a new attempt.
    const recoveryClaim = await supabase.from('creatives').update({ status: 'pending' })
      .eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering')
      .eq('updated_at', creative.updated_at).select('id').maybeSingle()
    if (!recoveryClaim.data) return { ok: true, pending: true, retryAfterSeconds: 10 }
    return processCreativeGeneration(creativeId, supabase)
  }

  const staleBefore = new Date(Date.now() - STALE_RENDER_MS).toISOString()
  if (creative.status === 'rendering') {
    const isStale = Boolean(creative.updated_at && creative.updated_at < staleBefore)
    if (!isStale) return { ok: false, busy: true, error: 'Üretim sürüyor.' }
    if (!isVideo) return { ok: false, busy: true, error: 'Önceki görsel gönderiminin sonucu doğrulanmalı; çift üretim başlatılmadı.' }
    await supabase
      .from('creatives')
      .update({ status: 'pending', error: null })
      .eq('id', creativeId)
      .eq('status', 'rendering')
      .lt('updated_at', staleBefore)
  }

  const claimed = await supabase
    .from('creatives')
    .update({ status: 'rendering', error: null })
    .eq('id', creativeId)
    .in('status', ['pending', 'failed'])
    .select('id, updated_at')
    .maybeSingle()

  if (!claimed.data) {
    const { data: again } = await supabase
      .from('creatives')
      .select('status, public_url')
      .eq('id', creativeId)
      .maybeSingle()
    if (again?.status === 'ready' && again.public_url) return { ok: true, skipped: true }
    if (again?.status === 'rendering') return { ok: false, busy: true, error: 'Üretim sürüyor.' }
    return { ok: false, error: 'Üretim kilitlenemedi.' }
  }
  let claimedUpdatedAt = claimed.data.updated_at

  try {
    const refs: ReferenceImage[] = []

    // 0. Beklenen referansların tespiti (Pre-flight Gate Kontratı)
    const expectedBase = Boolean(snapshot.baseCreativeId)
    const expectedProducts = snapshot.products.filter((p) => Boolean(p.include?.image && p.imageUrl))
    const shouldIncludeLogo = snapshot.useLogo !== false
    let expectedLogoPath: string | null = null
    if (shouldIncludeLogo) {
      expectedLogoPath = (snapshot as any).customLogoUrl || snapshot.brandKit?.logoPath || null
      if (!expectedLogoPath) {
        const { data: orgLogo } = await supabase
          .from('organizations')
          .select('logo_path')
          .eq('id', creative.org_id)
          .maybeSingle()
        expectedLogoPath = orgLogo?.logo_path ?? null
      }
    }
    const expectedLogo = Boolean(shouldIncludeLogo && expectedLogoPath)
    const expectedRefUrls = Array.isArray(snapshot.referenceImageUrls) ? snapshot.referenceImageUrls : []
    const expected_reference_count = (expectedBase ? 1 : 0) + expectedProducts.length + (expectedLogo ? 1 : 0) + expectedRefUrls.length

    // 1. Kaynak görsel (Revizyon, Varyasyon veya Görselden Türet):
    if (snapshot.baseCreativeId) {
      const { data: base } = await supabase
        .from('creatives')
        .select('public_url, org_id')
        .eq('id', snapshot.baseCreativeId)
        .eq('org_id', creative.org_id)
        .maybeSingle()
      if (!base?.public_url) {
        throw new Error('REFERENCE_RESOLUTION_FAILED: Kaynak görsel bulunamadı; referanssız üretim başlatılmadı.')
      }
      const baseAsset = await resolveAssetSource(base.public_url, { tenantId: creative.org_id, supabase })
      if (!baseAsset) {
        throw new Error('REFERENCE_RESOLUTION_FAILED: Kaynak görsel indirilemedi; referanssız üretim başlatılmadı.')
      }
      refs.push({ data: baseAsset.data, mimeType: baseAsset.mimeType, role: 'base' })
    }

    // 2. Ürün görseli referansı:
    for (const product of snapshot.products) {
      if (!product.include?.image) continue
      if (!product.imageUrl) throw new Error(`REFERENCE_RESOLUTION_FAILED: Seçilen ürünün görseli eksik: ${product.name}`)
      const prodAsset = await resolveAssetSource(product.imageUrl, { tenantId: creative.org_id, supabase })
      if (!prodAsset) {
        throw new Error(`REFERENCE_RESOLUTION_FAILED: Seçilen ürün görseli indirilemedi (${product.name}: ${product.imageUrl}); referanssız üretim başlatılmadı.`)
      }
      refs.push({ data: prodAsset.data, mimeType: prodAsset.mimeType, role: 'product' })
    }

    // 3. Logo Referansı:
    if (expectedLogo && expectedLogoPath) {
      const logoAsset = await resolveAssetSource(expectedLogoPath, { tenantId: creative.org_id, supabase })
      if (!logoAsset) {
        throw new Error(`REFERENCE_RESOLUTION_FAILED: Marka logosu indirilemedi (${expectedLogoPath}); logosuz üretim başlatılmadı.`)
      }
      refs.push({ data: logoAsset.data, mimeType: logoAsset.mimeType, role: 'logo' })
    }

    const logoHashes = new Set(refs.filter(ref => ref.role === 'logo').map(ref => createHash('sha256').update(ref.data).digest('hex')))
    if (refs.some(ref => ref.role === 'product' && logoHashes.has(createHash('sha256').update(ref.data).digest('hex')))) {
      throw new Error('PRODUCT_REFERENCE_IS_LOGO: Ürün referansı ve işletme logosu aynı dosya. Gerçek ürün veya arayüz görseli ekleyin.')
    }

    // 4. Ek referans görseller:
    for (const refUrl of expectedRefUrls) {
      const refAsset = await resolveAssetSource(refUrl, { tenantId: creative.org_id, supabase })
      if (!refAsset) {
        throw new Error(`REFERENCE_RESOLUTION_FAILED: Ek referans görsel indirilemedi (${refUrl}); üretim başlatılmadı.`)
      }
      refs.push({ data: refAsset.data, mimeType: refAsset.mimeType, role: 'base' })
    }

    if (refs.length > MAX_REFS) {
      throw new Error(`En fazla ${MAX_REFS} referans destekleniyor (logo ve ürün dahil). Referanslar sessizce çıkarılmadı.`)
    }

    // 🎯 PRE-FLIGHT GATE: expected_reference_count === resolved_reference_count
    const resolved_reference_count = refs.length
    if (resolved_reference_count !== expected_reference_count) {
      throw new Error(
        `REFERENCE_PREFLIGHT_MISMATCH: expected_reference_count (${expected_reference_count}) !== resolved_reference_count (${resolved_reference_count}). Prompt gönderilmedi.`
      )
    }

    // Dinamik Prompt Fidelity: Sadece doğrulanmış ekler promptta belirtilir
    const verifiedRefs = {
      logo: refs.some((r) => r.role === 'logo'),
      product: refs.some((r) => r.role === 'product'),
      base: refs.some((r) => r.role === 'base'),
    }

    const targetFormatV2: ImageFormatV2 =
      snapshot.formatId === 'story' || snapshot.formatId === 'reels_video' || snapshot.aspect === '9:16'
        ? 'STORY_9_16'
        : snapshot.formatId === 'portrait' || snapshot.formatId === 'feed' || snapshot.aspect === '4:5'
          ? 'PORTRAIT_4_5'
          : 'SQUARE_1_1'

    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, ai_image_mode')
      .eq('id', creative.org_id)
      .maybeSingle()

    const preferred = payload.creativeDirectorVersion === 'V3' ? 'omnistudio'
      : (orgData as { ai_image_mode?: string | null })?.ai_image_mode === 'fast' ? 'openai' : 'omnistudio'
    const bag: AiKeyBag = { preferredImageProvider: preferred }

    const customerName = (orgData as { name?: string | null })?.name || creative.org_id.slice(0, 8)
    const workspaceTitle = snapshot.brief ? `Kreatif: ${snapshot.brief.slice(0, 40)}` : 'Kreatif Sihirbazı'

    // Live image quality preservation:
    // Existing prompt behavior already produces acceptable CTA, price, promo, and text.
    // Use buildImagePromptV2 only if deterministic locked copy overlay is requested.
    const useLockedCopy = Boolean((payload as any).lockCopyOverlay)

    const prompt = creative.template === 'ai_send' && payload.quickSendPrompt
      ? payload.quickSendPrompt
      : useLockedCopy
        ? buildImagePromptV2({
            brandName: customerName,
            productName: snapshot.products?.[0]?.name || 'Ürün',
            productDescription: snapshot.products?.[0]?.description,
            stylePreset: mapLegacyStyleToPreset((payload as any).stylePreset || snapshot.style),
            format: targetFormatV2,
            plan: (payload as any).creativePlan,
            hasLogoRef: verifiedRefs.logo,
            hasProductRef: verifiedRefs.product,
          }).prompt
        : buildCreativePrompt(snapshot, {
            verifiedRefs,
            artDirectionPlan: (payload as any).qualityMode === 'DESIGNER' ? (payload as any).artDirectionPlan : null,
            mode: payload.creativeDirectorVersion === 'V3' && (payload as any).qualityMode === 'DESIGNER' ? 'V3' : undefined,
          }).prompt
    const aspect = snapshot.aspect || formatToAspect(creative.format)

    const isVideo = creative.format === 'video' || snapshot.formatId === 'reels_video'


    if (isVideo) {
      // 0. İşletme Bazlı Video Kotası Güvence Kontrolü
      const { data: orgQuotaData } = await supabase
        .from('organizations')
        .select('monthly_video_quota')
        .eq('id', creative.org_id)
        .maybeSingle()

      const videoQuota = orgQuotaData?.monthly_video_quota ?? 3

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: videoUsedCount } = await supabase
        .from('creatives')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', creative.org_id)
        .eq('format', 'video')
        .in('status', ['ready', 'processing', 'pending'])
        .neq('id', creative.id)
        .gte('created_at', startOfMonth.toISOString())

      const used = videoUsedCount ?? 0
      if (used >= videoQuota) {
        throw new Error(`Bu ayki video üretim kotanıza (${used}/${videoQuota}) ulaştınız. Limit artırımı için lütfen platform yöneticinizle iletişime geçin.`)
      }

      const resolveAssetUrl = (rawUrl: string | null): string | null => {
        if (!rawUrl) return null
        const gw = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')
        if (rawUrl.includes('media-proxy?file=')) {
          const fileName = rawUrl.split('media-proxy?file=')[1]?.split('&')[0]
          if (fileName) return `${gw}/outputs/${decodeURIComponent(fileName)}`
        }
        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          if (rawUrl.includes('media-proxy?file=')) {
            const fileName = rawUrl.split('media-proxy?file=')[1]?.split('&')[0]
            if (fileName) return `${gw}/outputs/${decodeURIComponent(fileName)}`
          }
          return rawUrl
        }
        const clean = rawUrl.replace(/^\/+/, '')
        const { data: pub } = supabase.storage.from('brand-assets').getPublicUrl(clean)
        return pub?.publicUrl || rawUrl
      }

      // 1. Kurumsal Logo & Marka Kiti Zorunluluk Kontrolü
      let logoUrl: string | null = (snapshot as any).customLogoUrl || null
      if (!logoUrl) {
        const { data: orgLogo } = await supabase
          .from('organizations')
          .select('logo_path')
          .eq('id', creative.org_id)
          .maybeSingle()
        logoUrl = orgLogo?.logo_path ?? null
      }
      if (!logoUrl && snapshot.brandKit?.logoPath) {
        logoUrl = snapshot.brandKit.logoPath
      }

      if (!logoUrl) {
        throw new Error('Video üretimi için kurumsal Logo ve Marka Kiti zorunludur. Yapay zekanın uydurma logo ve semboller üretmemesi için lütfen Ayarlar > Marka Kiti bölümünden logonuzu tanımlayın.')
      }

      logoUrl = resolveAssetUrl(logoUrl)

      // 2. Ürün Görseli veya Kurumsal Hizmet Çözümlemesi
      const chosenProduct = snapshot.products?.[0]
      let productImageUrl = chosenProduct?.imageUrl || null

      if (!productImageUrl) {
        throw new Error('Video için seçilen ürünün kanonik referans görseli eksik; başka ürün veya logo yerine kullanılmadı.')
      }

      productImageUrl = resolveAssetUrl(productImageUrl)

      const { overlay } = buildVideoPrompt(snapshot)
      let videoPrompt: string = ''
      let v6Result: any = null
      let v5Result: any = null
      const v6Enabled = process.env.CREATIVE_DIRECTOR_V6_ENABLED !== 'false'

      if (v6Enabled) {
        try {
          const { compileAutonomousCommercialV6 } = await import('./v6')
          v6Result = compileAutonomousCommercialV6({
            orgId: creative.org_id,
            brandName: overlay.brandName || snapshot.brandKit?.name || null,
            brief: snapshot.brief || 'İşletme reklam filmi',
            productName: chosenProduct?.name || null,
            productDescription: chosenProduct?.description || null,
            productImageUrl,
            referenceAssetIds: (snapshot.referenceImageUrls || []).map((u: string) => resolveAssetUrl(u) || u).filter(Boolean),
            logoUrl,
            offer: overlay.offerTitle || null,
            cta: overlay.ctaText || null,
            durationSeconds: (snapshot as any).durationSeconds || 10,
            aspectRatio: aspect || '9:16',
            brandKit: {
              name: overlay.brandName || snapshot.brandKit?.name,
              colors: snapshot.brandKit?.colors,
              logoUrl,
            },
            customVoiceover: (snapshot as any).customVoiceover || null,
          }, {
            cameraMode: (snapshot as any).cameraMode || undefined,
          })
          videoPrompt = v6Result.veoPrompt
          console.log('[CreativeProcess] V6 Autonomous Commercial Director promptu başarıyla derlendi:', videoPrompt.slice(0, 100))
        } catch (v6Err: any) {
          console.error('[CreativeProcess] 🛑 V6 derleme hatası (Legacy bypass engellendi):', v6Err)
          throw new Error(`CREATIVE_DIRECTOR_V6_FAILED: Autonomous commercial compilation failed under V6 mandate: ${v6Err?.message || v6Err}`)
        }
      } else {
        // Legacy V5 path only when explicitly disabled via CREATIVE_DIRECTOR_V6_ENABLED=false
        try {
          const { compileDeterministicV5 } = await import('./v5')
          v5Result = compileDeterministicV5({
            brandName: overlay.brandName || snapshot.brandKit?.name || null,
            brief: snapshot.brief || 'İşletme reklam filmi',
            customText: snapshot.customText || null,
            ctaText: overlay.ctaText || null,
            campaignDeadline: snapshot.dateRange || null,
            deliveryArea: (snapshot as any).deliveryArea || null,
            cameraMode: (snapshot as any).cameraMode || undefined,
            products: (snapshot.products || []).map((p) => ({
              name: p.name,
              imageUrl: resolveAssetUrl(p.imageUrl || productImageUrl),
              price: p.price,
              promo: p.promo,
              description: p.description,
            })),
            productImageUrl,
            logoUrl,
            brandKit: {
              name: overlay.brandName || snapshot.brandKit?.name,
              colors: snapshot.brandKit?.colors,
              fonts: snapshot.brandKit?.fonts,
              logoUrl,
            },
            videoSpeech: (snapshot as any).videoSpeech !== false,
            customVoiceover: (snapshot as any).customVoiceover || null,
          })
          videoPrompt = v5Result.veoPrompt
          console.log('[CreativeProcess] V5 Video Engine promptu başarıyla derlendi (continuous_take):', videoPrompt.slice(0, 100))
        } catch (v5Err) {
          console.warn('[CreativeProcess] V5 fallback, legacy scenario kullanılıyor:', v5Err)
          const { generateBackgroundMasterPrompt } = await import('./video-scenario')
          videoPrompt = await generateBackgroundMasterPrompt(snapshot, bag)
        }
      }

      const gatewayUrl = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')

      let videoUrl = (snapshot as CreativePayload).pendingVideoUrl || null
      let cleanVideoUrl: string | null = (snapshot as CreativePayload).cleanPublicUrl || null
      let rawThumbUrl: string | null = (snapshot as CreativePayload).thumbnailUrl || null

      if (!videoUrl) {
        console.log('[CreativeProcess] Flow / Veo video üretimi başlatılıyor...')
        const assetInputs = [ { role: 'logo', url: logoUrl }, { role: 'product', url: productImageUrl },
          ...(snapshot.referenceImageUrls || []).map(url => ({ role: 'reference', url: resolveAssetUrl(url) || url })) ]
        const assetHashes = await Promise.all(assetInputs.map(async asset => {
          const resolved = await resolveAssetSource(asset.url, { tenantId: creative.org_id, supabase })
          if (!resolved) {
            if (asset.role === 'logo') throw new Error('LOGO_ASSET_DOWNLOAD_FAILED')
            if (asset.role === 'product') throw new Error('PRODUCT_ASSET_DOWNLOAD_FAILED')
            throw new Error('REFERENCE_ASSET_DOWNLOAD_FAILED')
          }
          return { role: asset.role, sha256: resolved.sha256 }
        }))
        const identity = createVideoGenerationIdentity({ orgId: creative.org_id, creativeId: creative.id,
          generationRevision: payload.generationRevision || 1, prompt: videoPrompt, assets: assetHashes,
          model: 'veo-lite', aspectRatio: '9:16', duration: 8, mode: 'LEGACY_SHORT_VIDEO',
          approvedDialogue: snapshot.customVoiceover || '',
          options: { subtitles: snapshot.subtitles !== false, useLogo: snapshot.useLogo !== false },
        })
        const requestBody = {
            async: true,
            idempotencyKey: identity.idempotencyKey,
            requestHash: identity.requestHash,
            generationRevision: payload.generationRevision || 1,
            orgId: creative.org_id,
            creativeId: creative.id,
            scopeKey: `creative:${creative.org_id}:${creative.id}`,
            conversationId: identity.conversationId,
            logoSha256: assetHashes[0].sha256,
            productSha256: assetHashes[1].sha256,
            referenceSha256: assetHashes.slice(2).map(asset => asset.sha256),
            model: 'veo-lite', aspectRatio: '9:16', duration: 8, creativeEngineMode: 'LEGACY_SHORT_VIDEO',
            prompt: videoPrompt,
            preferredEngine: 'flow',
            engine: 'flow',
            useFlow: true,
            voiceoverText: (snapshot as any).customVoiceover || null,
            brandName: overlay.brandName,
            productName: chosenProduct?.name || null,
            productImageUrl,
            referenceImageUrls: (snapshot.referenceImageUrls || []).map((u: string) => resolveAssetUrl(u) || u),
            logoUrl,
            includeLogo: snapshot.useLogo !== false,
            includeOverlay: false,
            subtitles: snapshot.subtitles !== false,
            subTitle: overlay.subTitle,
            offerTitle: overlay.offerTitle,
            offerDetails: overlay.offerDetails,
            ctaText: overlay.ctaText,
            primaryColor: overlay.primaryColor,
            accentColor: overlay.accentColor,
            customer: customerName,
            sceneContracts: v6Result?.sceneContracts || v5Result?.sceneContracts || null,
            creativeDNA: v6Result?.dna || v5Result?.creativeDNA || null,
            creativeScore: v6Result?.conceptTournament?.winnerScore?.totalScore || v5Result?.creativeScore || null,
            audioPlan: v6Result?.audioPlan || null,
            directorTreatment: v6Result?.directorTreatment || null,
            tournamentWinner: v6Result?.conceptTournament?.winner?.name || null,
            v6Package: v6Result ? {
              version: v6Result.version,
              grammarType: v6Result.grammarType,
              promise: v6Result.promise,
              beatSheet: v6Result.beatSheet,
              causeEffectGraph: v6Result.causeEffectGraph,
            } : null,
        }
        const intent = payload.videoSubmitIntent || { idempotencyKey: identity.idempotencyKey, requestHash: identity.requestHash,
          attemptId: `${creative.id}:revision:${payload.generationRevision || 1}`, gatewayUrl, startedAt: new Date().toISOString(), body: requestBody }
        const vidJson = await submitVideoWithIntent(intent, async savedIntent => {
          const persisted = await supabase.from('creatives').update({ payload: { ...payload, videoSubmitIntent: savedIntent, videoSubmissionUncertain: true } })
            .eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering').eq('updated_at', claimedUpdatedAt)
            .select('id,updated_at').maybeSingle()
          if (persisted.error || persisted.data?.id !== creativeId) throw new Error('VIDEO_SUBMIT_INTENT_PERSISTENCE_FAILED')
          claimedUpdatedAt = persisted.data.updated_at
          payload.videoSubmitIntent = savedIntent
          Object.assign(snapshot, { videoSubmitIntent: savedIntent })
        }, Boolean(payload.videoSubmitIntent))

        // Flow kuyrukta dakikalarca kalabilir. Bu isteği açık tutmak yerine job
        // kimliğini kalıcı olarak yazıp worker'ın kısa turla devam etmesini sağla.
        if (vidJson.job_id && !readVideoResult(vidJson).videoUrl) {
          const jobId = vidJson.job_id
          console.log(`[CreativeProcess] ⏳ Video görevi kuyruğa alındı [${jobId}], pozisyon: ${vidJson.queue_position}.`)

          const { error: queueStateError } = await supabase
            .from('creatives')
            .update({
              status: 'rendering',
              payload: {
                ...snapshot,
                flowJob: {
                  id: String(jobId),
                  gatewayUrl,
                  queuedAt: new Date().toISOString(),
                  queuePosition: typeof vidJson.queue_position === 'number' ? vidJson.queue_position : null,
                  estimatedWaitSeconds:
                    typeof vidJson.estimated_wait_seconds === 'number'
                      ? vidJson.estimated_wait_seconds
                      : null,
                  lastStatus: typeof vidJson.status === 'string' ? vidJson.status : 'queued',
                  lastCheckedAt: new Date().toISOString(),
                },
              },
            })
            .eq('id', creative.id)
          if (queueStateError) throw new Error(queueStateError.message)
          const progressInfo = computeVideoProgress(
            { queuedAt: new Date().toISOString(), queuePosition: vidJson.queue_position },
            vidJson,
            creative.created_at,
          )
          return { ok: true, pending: true, retryAfterSeconds: FLOW_POLL_RETRY_SECONDS, progressInfo }
        }

        const submittedOutput = readVideoResult(vidJson)
        videoUrl = submittedOutput.videoUrl
        if (!videoUrl) throw new Error('Video URL alınamadı')

        cleanVideoUrl = submittedOutput.cleanVideoUrl
        rawThumbUrl = submittedOutput.thumbnailUrl

        // 🎯 AŞAMA 1: Video Flow'da üretildi!
        // İndirme veya storage aksasa bile yeniden Veo çalıştırmamak için pendingVideoUrl'yi hemen kaydet.
        await supabase
          .from('creatives')
          .update({
            status: 'rendering',
            error: null,
            payload: {
              ...snapshot,
              pendingVideoUrl: videoUrl,
              cleanPublicUrl: cleanVideoUrl,
              thumbnailUrl: rawThumbUrl,
            },
          })
          .eq('id', creativeId)
      } else {
        console.log('[CreativeProcess] Mevcut üretilmiş video bulundu, yeniden üretim atlandı:', videoUrl)
      }

      // Flow çıktısı gateway'de range-stream edilebiliyor ve panel proxy'si bu
      // URL'yi oynatıyor. Storage'a tam kopya alma yavaşlasa bile ekranın
      // "hazır" durumuna geçmesini buna bağlamıyoruz.
      const nextPayload: CreativePayload = {
        ...snapshot,
        originalPrompt: snapshot.brief,
        generatedPrompt: videoPrompt,
        provider: 'omnistudio_veo',
        thumbnailUrl: rawThumbUrl || null,
        cleanPublicUrl: cleanVideoUrl || null,
        cleanStoragePath: null,
        pendingVideoUrl: null,
        flowJob: null,
        cost: { provider: 'omnistudio_veo', imageCount: 1 },
        ...(v6Result ? {
          v6Director: {
            version: v6Result.version,
            grammarType: v6Result.grammarType,
            promise: v6Result.promise,
            directorTreatment: v6Result.directorTreatment,
            audioPlan: v6Result.audioPlan,
            winnerConcept: v6Result.conceptTournament?.winner?.name || null,
            creativeScore: v6Result.conceptTournament?.winnerScore?.totalScore || null,
          }
        } : {}),
      }

      // Flow tamamlandığı anda URL kayda yazılır; indirme/Storage gecikmesi
      // kullanıcının videoyu görmesini ya da oynatmasını engelleyemez.
      const { error: dbErr } = await supabase
        .from('creatives')
        .update({
          status: 'ready',
          error: null,
          storage_path: `external/${crypto.randomUUID()}.mp4`,
          public_url: videoUrl,
          width: 720,
          height: 1280,
          payload: nextPayload,
        })
        .eq('id', creativeId)
        .eq('org_id', creative.org_id)

      if (dbErr) throw new Error(dbErr.message)
      return { ok: true, ready: true, publicUrl: videoUrl, thumbnailUrl: rawThumbUrl }
    }

    const { image, attempts } = await generateImage(prompt, aspect, bag, refs, {
      expectedReferenceCount: expected_reference_count,
      customer: customerName,
      workspace: workspaceTitle,
      tenantId: creative.org_id,
      orgId: creative.org_id,
      conversationId: creative.id,
      requestId: payload.imageSubmitIntent?.requestId || `${creative.id}:image:${payload.imageAttempt || 'initial'}`,
      brandKit: snapshot.brandKit,
      enqueueOnly: true,
      recoveringSubmission: payload.imageSubmissionUncertain === true || Boolean(payload.imageSubmitIntent),
      submissionGatewayUrl: payload.imageSubmitIntent?.gatewayUrl,
      onDirectSubmitting: async intent => {
        const imageDirectIntent = { ...intent, storagePath: `${creative.org_id}/${creative.id}/direct-${createHash('sha256').update(intent.requestId + ':' + intent.provider).digest('hex')}.image`, startedAt: new Date().toISOString() }
        const saved = await supabase.from('creatives').update({
          payload: { ...payload, imageDirectIntent, imageReconciliationRequired: true },
        }).eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering')
          .eq('updated_at', claimedUpdatedAt).select('id, updated_at').maybeSingle()
        if (saved.error || saved.data?.id !== creativeId) throw new Error('Doğrudan üretim niyeti kaydedilemedi; üretim yapılmadı.')
        payload.imageDirectIntent = imageDirectIntent
        payload.imageReconciliationRequired = true
        claimedUpdatedAt = saved.data.updated_at
      },
      onSubmitting: async intent => {
        const imageSubmitIntent = payload.imageSubmitIntent || { ...intent, startedAt: new Date().toISOString() }
        const saved = await supabase.from('creatives').update({
          payload: { ...payload, imageSubmitIntent, imageSubmissionUncertain: true },
        }).eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering')
          .eq('updated_at', claimedUpdatedAt).select('id, updated_at').maybeSingle()
        if (saved.error || saved.data?.id !== creativeId) throw new Error('Gönderim niyeti kalıcı kaydedilemedi; üretim başlatılmadı.')
        payload.imageSubmitIntent = imageSubmitIntent
        payload.imageSubmissionUncertain = true
        claimedUpdatedAt = saved.data.updated_at
      },
      onQueued: async imageJob => {
        const saved = await supabase.from('creatives').update({
          payload: { ...payload, imageJob, imageSubmissionUncertain: false, generatedPrompt: prompt, originalPrompt: snapshot.brief },
        }).eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering')
          .eq('updated_at', claimedUpdatedAt).select('id,updated_at').maybeSingle()
        if (saved.error) throw new Error(saved.error.message)
        if (saved.data?.id !== creativeId) throw new Error('Üretim kaydı başka işlem tarafından değiştirildi; mevcut iş korunuyor.')
        claimedUpdatedAt = saved.data.updated_at
        payload.imageJob = imageJob
      },
    })
    const rawGenerationSha256 = createHash('sha256').update(image.data).digest('hex')

    // Deterministic commercial composition: optional/fallback "locked copy" path
    // Normal default path preserves generative model's output without regression.
    let finalImageBytes = image.data
    let finalWidth = image.width || 1080
    let finalHeight = image.height || 1080
    let finalMimeType = image.mimeType || 'image/jpeg'
    let finalSha256 = rawGenerationSha256

    if (Boolean((payload as any).lockCopyOverlay)) {
      const logoRef = refs.find((r) => r.role === 'logo')
      const headline = (payload as any).customHeadline || (payload as any).creativePlan?.copy?.headline || snapshot.brief || ''
      const supporting = (payload as any).customSupporting || (payload as any).creativePlan?.copy?.supporting_line || ''
      const cta = snapshot.cta || (payload as any).creativePlan?.copy?.cta || 'İnceleyin'
      const price = snapshot.products?.[0]?.price || null
      const oldPrice = snapshot.products?.[0]?.oldPrice || null
      const offer = snapshot.products?.[0]?.promo || null

      try {
        const composited = await compositeCommercialCreative({
          baseImageBuffer: image.data,
          logoBuffer: logoRef?.data || null,
          targetFormat: targetFormatV2,
          brandPalette: {
            primary: snapshot.brandKit?.colors?.primary || '#008069',
            accent: snapshot.brandKit?.colors?.accent || '#00a884',
            secondary: snapshot.brandKit?.colors?.secondary || null,
          },
          copy: {
            headline,
            supportingLine: supporting,
            price,
            oldPrice,
            offer,
            dateRange: snapshot.dateRange || null,
            cta,
          },
          layout: (payload as any).creativePlan?.layout,
        })

        finalImageBytes = composited.buffer
        finalWidth = composited.width
        finalHeight = composited.height
        finalMimeType = composited.mimeType
        finalSha256 = composited.finalSha256
      } catch (compositeError) {
        console.warn('[CreativeProcess] Locked copy composition fallback to base image:', compositeError)
      }
    }


    const ext = finalMimeType.includes('jpeg') ? 'jpg' : finalMimeType.includes('webp') ? 'webp' : 'png'
    const path = payload.imageDirectIntent?.storagePath || `${creative.org_id}/${crypto.randomUUID()}.${ext}`
    const { error: upError } = await supabase.storage.from('creatives').upload(path, finalImageBytes, {
      contentType: finalMimeType,
      upsert: false,
    })
    if (upError) throw new Error(upError.message)

    const { data: storedImage, error: storageReadError } = await supabase.storage.from('creatives').download(path)
    if (storageReadError || !storedImage || storedImage.size > 32 * 1024 * 1024) throw new Error('IMAGE_STORAGE_READBACK_FAILED')
    const storedReceipt = await verifyPersistedImageBytes(finalImageBytes, Buffer.from(await storedImage.arrayBuffer()))

    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)
    const nextPayload: CreativePayload = {
      ...snapshot,
      imageJob: payload.imageJob || null,
      imageOutputReceipt: {
        orgId: creative.org_id, creativeId, jobId: payload.imageJob?.id || null,
        generation_sha256: rawGenerationSha256,
        final_sha256: finalSha256,
        sha256: storedReceipt.sha256, size: storedReceipt.size,
        mimeType: storedReceipt.mimeType, width: finalWidth, height: finalHeight,
        decodedImage: true, storagePath: path, referenceReceipt: image.referenceReceipt || null,
      },
      imageDirectIntent: null,
      imageSubmitIntent: null,
      imageSubmissionUncertain: false,
      imageReconciliationRequired: false,
      originalPrompt: snapshot.brief,
      generatedPrompt: prompt,
      provider: image.provider,
      attempts: attempts.length ? attempts : null,
      cost: { provider: image.provider, imageCount: 1 },
      campaignMessage:
        snapshot.campaignMessage || generateCampaignWhatsAppMessage(deriveVerifiedCampaignData(snapshot)),
    }

    const { error, data: finalized } = await supabase
      .from('creatives')
      .update({
        status: imagePublicationStatus(snapshot),
        error: null,
        storage_path: path,
        public_url: publicUrl.publicUrl,
        width: finalWidth,
        height: finalHeight,
        payload: nextPayload,
      })
      .eq('id', creativeId)
      .eq('org_id', creative.org_id)
      .eq('status', 'rendering')
      .eq('updated_at', claimedUpdatedAt)
      .select('id').maybeSingle()

    if (error) throw new Error(error.message)
    if (finalized?.id !== creativeId) throw new Error('Final görsel kaydı başka işlem tarafından değiştirildi; ham çıktı korunuyor.')
    return { ok: true, ready: imagePublicationStatus(snapshot) === 'ready', needsReview: imagePublicationStatus(snapshot) === 'needs_review', publicUrl: publicUrl.publicUrl }
  } catch (error) {
    if (isVideo && error instanceof VideoJobTerminalError) {
      const message = `${error.code}: ${error.message}`.slice(0, 400)
      await supabase.from('creatives').update({ status: 'failed', error: message,
        payload: { ...payload, videoSubmissionUncertain: false } })
        .eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering').eq('updated_at', claimedUpdatedAt)
      return { ok: false, error: message }
    }
    if (isVideo && (error instanceof VideoSubmissionUncertainError || payload.videoSubmitIntent)) {
      await supabase.from('creatives').update({ error: 'VIDEO_SUBMISSION_UNCERTAIN', payload: { ...payload, videoSubmissionUncertain: true } })
        .eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering').eq('updated_at', claimedUpdatedAt)
      return { ok: true, pending: true, retryAfterSeconds: 10 }
    }
    if (error instanceof DirectImageReconciliationError || payload.imageDirectIntent) {
      // Intent is already durable, so even loss of this diagnostic write cannot trigger generation.
      await supabase.from('creatives').update({ error: 'Doğrudan üretim sonucu uzlaştırılmalı; ikinci üretim yapılmadı.',
        payload: { ...payload, imageReconciliationRequired: true },
      }).eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering')
        .eq('updated_at', claimedUpdatedAt)
      return { ok: false, error: 'Üretim sonucu uzlaştırılmalı; mevcut ham çıktı varsa yalnız kaydetme yeniden denenecek.' }
    }
    if (error instanceof ImageJobPendingError) {
      // The same stable request key recovers the receipt even if the first persistence failed.
      const saved = await supabase.from('creatives').update({ status: 'rendering', error: null,
        payload: { ...payload, imageJob: error.job, imageSubmissionUncertain: false, generatedPrompt: buildCreativePrompt(snapshot).prompt },
      }).eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering')
        .eq('updated_at', claimedUpdatedAt).select('id').maybeSingle()
      return { ok: true, pending: true, retryAfterSeconds: saved.error ? 10 : 5 }
    }
    if (error instanceof ImageSubmissionUncertainError) {
      await supabase.from('creatives').update({ status: 'rendering', error: error.message,
        payload: { ...payload, imageSubmissionUncertain: true },
      }).eq('id', creativeId).eq('org_id', creative.org_id).eq('status', 'rendering')
        .eq('updated_at', claimedUpdatedAt)
      return { ok: true, pending: true, retryAfterSeconds: 10 }
    }
    const message = error instanceof Error ? error.message : 'Görsel üretilemedi.'
    console.error('[creative.generate]', creativeId, message)
    await supabase
      .from('creatives')
      .update({
        status: 'failed',
        error: message.slice(0, 400),
      })
      .eq('id', creativeId)
    return { ok: false, error: message }
  }
}
