import type { SupabaseClient } from '@supabase/supabase-js'
import { DirectImageReconciliationError, generateImage, type ReferenceImage } from '@/lib/ai/image'
import { inspectImageOutput } from '@/lib/ai/image-output'
import { ImageJobFailedError, ImageJobPendingError, ImageJobReconciliationError, ImageSubmissionUncertainError, readImageJob } from '@/lib/ai/omnistudio-image-job'
import { createHash } from 'node:crypto'
import type { AiKeyBag } from '@/lib/ai/config'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { buildCreativePrompt, buildVideoPrompt } from './prompt'
import { formatToAspect, type CreativePayload, type CreativeSnapshot } from './types'

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

  if (creative.status === 'ready' && creative.public_url) {
    return {
      ok: true,
      skipped: true,
      ready: true,
      publicUrl: creative.public_url,
      thumbnailUrl: (creative.payload as any)?.thumbnailUrl || null,
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
      const { data: url } = supabase.storage.from('creatives').getPublicUrl(storagePath)
      const update = await supabase.from('creatives').update({
        status: 'ready', error: null, storage_path: storagePath, public_url: url.publicUrl,
        width: image.width || null, height: image.height || null,
        payload: { ...payload, imageJob: null, provider: 'omnistudio', outputSha256: createHash('sha256').update(image.data).digest('hex'), cost: { provider: 'omnistudio', imageCount: 1 } },
      }).eq('id', creativeId).eq('org_id', creative.org_id).eq('payload->imageJob->>id', payload.imageJob.id).select('id').maybeSingle()
      if (update.error) return { ok: true, pending: true, retryAfterSeconds: 10, error: update.error.message }
      if (update.data?.id !== creativeId) return { ok: true, pending: true, retryAfterSeconds: 5 }
      return { ok: true, ready: true, publicUrl: url.publicUrl }
    } catch (error) {
      if (!(error instanceof ImageJobFailedError)) return { ok: true, pending: true, retryAfterSeconds: 10 }
      const message = error.message.slice(0,400)
      await supabase.from('creatives').update({ status: 'failed', error: message,
        payload: error instanceof ImageJobReconciliationError
          ? { ...payload, imageReconciliationRequired: true }
          : { ...payload, imageTerminalFailure: { kind: 'PROVIDER_FAILED', jobId: payload.imageJob.id,
            gatewayUrl: payload.imageJob.gatewayUrl }, imageSubmissionUncertain: false },
      }).eq('id', creativeId).eq('org_id', creative.org_id).eq('payload->imageJob->>id', payload.imageJob.id)
      return { ok: false, error: message }
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

  // 1. Kaynak görsel (Revizyon, Varyasyon veya Görselden Türet):
  if (snapshot.baseCreativeId) {
    const { data: base } = await supabase
      .from('creatives')
      .select('public_url, org_id')
      .eq('id', snapshot.baseCreativeId)
      .eq('org_id', creative.org_id)
      .maybeSingle()
    if (base?.public_url) {
      const image = await fetchBuffer(base.public_url)
      if (!image) throw new Error('Kaynak görsel indirilemedi; referanssız üretim başlatılmadı.')
      refs.push({ ...image, role: 'base' })
    } else throw new Error('Kaynak görsel bu müşteride bulunamadı.')
  }

  // 2. Ürün görseli referansı (Varsa her zaman eklenir):
  // BUG-FIX: Önceki limit >= 1 idi, çoklu ürün kampanyalarında sadece 1 ürün
  // görseli gidiyordu. Şimdi logo ve base için yer bırakarak 2'ye çıkarıldı.
  for (const product of snapshot.products) {
    if (!product.include?.image) continue
    if (!product.imageUrl) throw new Error(`Seçilen ürünün görseli eksik: ${product.name}`)
    const image = await fetchBuffer(product.imageUrl)
    if (!image) throw new Error(`Seçilen ürün görseli indirilemedi: ${product.name}`)
    refs.push({ ...image, role: 'product' })
  }

  // 4. Logo Referansı: İşletmenin logosu varsa ve useLogo açıkça false yapılmamışsa HER ZAMAN GİTSİN!
  const shouldIncludeLogo = snapshot.useLogo !== false
  if (shouldIncludeLogo) {
    let logoPath = (snapshot as any).customLogoUrl || snapshot.brandKit?.logoPath || null
    if (!logoPath) {
      const { data: orgLogo } = await supabase
        .from('organizations')
        .select('logo_path')
        .eq('id', creative.org_id)
        .maybeSingle()
      logoPath = orgLogo?.logo_path ?? null
    }

    if (logoPath) {
      if (logoPath.startsWith('http')) {
        const image = await fetchBuffer(logoPath)
        if (!image) throw new Error('Marka logosu indirilemedi; logosuz üretim başlatılmadı.')
        refs.push({ ...image, role: 'logo' })
      } else {
        let blob = (await supabase.storage.from('brand-assets').download(logoPath)).data
        if (!blob) {
          blob = (await supabase.storage.from('creatives').download(logoPath)).data
        }
        if (blob) {
          const buffer = Buffer.from(await blob.arrayBuffer())
          if (buffer.length >= 32) {
            const ext = logoPath.split('.').pop()?.toLowerCase()
            const mimeType =
              ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : ext === 'webp'
                  ? 'image/webp'
                  : 'image/png'
            refs.push({ data: buffer, mimeType, role: 'logo' })
          }
        }
      }
    }
    if (!refs.some(ref => ref.role === 'logo')) throw new Error('Seçilen marka logosu okunamadı; üretim başlatılmadı.')
  }

  // Additional references cannot silently displace a canonical product or logo.
  for (const refUrl of snapshot.referenceImageUrls || []) {
    const image = await fetchBuffer(refUrl)
    if (!image) throw new Error('Ek referans görsel indirilemedi; üretim başlatılmadı.')
    refs.push({ ...image, role: 'base' })
  }
  if (refs.length > MAX_REFS) throw new Error(`En fazla ${MAX_REFS} referans destekleniyor (logo ve ürün dahil). Referanslar sessizce çıkarılmadı.`)

  // Only the server-created quick-send template may preserve its existing prompt.
  // Wizard payloads cannot override their reference-led compiler.
  const prompt = creative.template === 'ai_send' && payload.quickSendPrompt
    ? payload.quickSendPrompt : buildCreativePrompt(snapshot).prompt
  const aspect = snapshot.aspect || formatToAspect(creative.format)

    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, ai_image_mode')
      .eq('id', creative.org_id)
      .maybeSingle()

    const preferred = (orgData as { ai_image_mode?: string | null })?.ai_image_mode === 'fast' ? 'openai' : 'omnistudio'
    const bag: AiKeyBag = { preferredImageProvider: preferred }

    const customerName = (orgData as { name?: string | null })?.name || creative.org_id.slice(0, 8)
    const workspaceTitle = snapshot.brief ? `Kreatif: ${snapshot.brief.slice(0, 40)}` : 'Kreatif Sihirbazı'

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
        const vidRes = await fetch(`${gatewayUrl}/v1/videos/generations`, {
          method: 'POST',
          signal: AbortSignal.timeout(60000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            async: true,
            idempotencyKey: `${creative.org_id || 'org'}:${creative.id}:${Date.now()}`,
            orgId: creative.org_id,
            creativeId: creative.id,
            scopeKey: `creative:${creative.org_id}:${creative.id}`,
            conversationId: `video-${creative.id}-${Date.now()}`,
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
          }),
        })

        if (!vidRes.ok) {
          throw new Error(`Video Motoru Hatası (${vidRes.status}): ${(await vidRes.text()).slice(0, 200)}`)
        }

        const vidJson = (await vidRes.json()) as any

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

        videoUrl = vidJson.data?.[0]?.url || vidJson.videoUrl || null
        if (!videoUrl) throw new Error('Video URL alınamadı')

        cleanVideoUrl = vidJson.data?.[0]?.cleanUrl || vidJson.cleanVideoUrl || null
        rawThumbUrl = vidJson.thumbnailUrl || vidJson.data?.[0]?.thumbnailUrl || null

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
          .eq('updated_at', claimedUpdatedAt).select('id').maybeSingle()
        if (saved.error) throw new Error(saved.error.message)
        if (saved.data?.id !== creativeId) throw new Error('Üretim kaydı başka işlem tarafından değiştirildi; mevcut iş korunuyor.')
      },
    })
    const ext = image.mimeType.includes('jpeg') ? 'jpg' : image.mimeType.includes('webp') ? 'webp' : 'png'
    const path = payload.imageDirectIntent?.storagePath || `${creative.org_id}/${crypto.randomUUID()}.${ext}`
    const { error: upError } = await supabase.storage.from('creatives').upload(path, image.data, {
      contentType: image.mimeType || 'image/png',
      upsert: false,
    })
    if (upError) throw new Error(upError.message)

    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)
    const nextPayload: CreativePayload = {
      ...snapshot,
      imageDirectIntent: null,
      imageSubmitIntent: null,
      imageSubmissionUncertain: false,
      imageReconciliationRequired: false,
      originalPrompt: snapshot.brief,
      generatedPrompt: prompt,
      provider: image.provider,
      attempts: attempts.length ? attempts : null,
      cost: { provider: image.provider, imageCount: 1 },
    }

    const { error, data: finalized } = await supabase
      .from('creatives')
      .update({
        status: 'ready',
        error: null,
        storage_path: path,
        public_url: publicUrl.publicUrl,
        width: image.width || null,
        height: image.height || null,
        payload: nextPayload,
      })
      .eq('id', creativeId)
      .eq('org_id', creative.org_id)
      .eq('status', 'rendering')
      .eq('updated_at', claimedUpdatedAt)
      .select('id').maybeSingle()

    if (error) throw new Error(error.message)
    if (finalized?.id !== creativeId) throw new Error('Final görsel kaydı başka işlem tarafından değiştirildi; ham çıktı korunuyor.')
    return { ok: true, ready: true, publicUrl: publicUrl.publicUrl }
  } catch (error) {
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
