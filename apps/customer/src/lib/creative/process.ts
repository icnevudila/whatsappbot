import type { SupabaseClient } from '@supabase/supabase-js'
import { generateImage, type ReferenceImage } from '@/lib/ai/image'
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
    const response = await fetch(url)
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
const FLOW_POLL_RETRY_SECONDS = 15

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
  retryAfterSeconds?: number
  error?: string
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
      'id, org_id, status, payload, format, brand_kit_id, parent_id, storage_path, public_url, updated_at',
    )
    .eq('id', creativeId)
    .maybeSingle()

  if (!creative) return { ok: false, error: 'Kayıt bulunamadı.' }

  const snapshot = asSnapshot(creative.payload)
  if (!snapshot) {
    await supabase
      .from('creatives')
      .update({ status: 'failed', error: 'Üretim özeti eksik.' })
      .eq('id', creativeId)
    return { ok: false, error: 'Üretim özeti eksik.' }
  }

  const payload = snapshot as CreativePayload
  const isVideo = creative.format === 'video' || snapshot.formatId === 'reels_video'

  if (creative.status === 'ready' && creative.public_url) {
    return { ok: true, skipped: true }
  }

  // Flow işi HTTP isteğinin ömründen uzundur. Job kimliği DB'de tutulur ve her
  // servis turunda yalnızca bir kez sorgulanır; uzun kuyrukta isteği açık tutmayız.
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
          return { ok: true, pending: true, retryAfterSeconds: FLOW_POLL_RETRY_SECONDS }
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
              },
            })
            .eq('id', creativeId)
            .eq('status', 'rendering')
          if (readyError) return { ok: false, error: readyError.message }
          return { ok: true }
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
        return { ok: true, pending: true, retryAfterSeconds: FLOW_POLL_RETRY_SECONDS }
      } catch (error) {
        console.warn('[creative.video.poll]', creativeId, error)
        return { ok: true, pending: true, retryAfterSeconds: FLOW_POLL_RETRY_SECONDS }
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

  const staleBefore = new Date(Date.now() - STALE_RENDER_MS).toISOString()
  if (creative.status === 'rendering') {
    const isStale = Boolean(creative.updated_at && creative.updated_at < staleBefore)
    if (!isStale) return { ok: false, busy: true, error: 'Üretim sürüyor.' }
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
    .select('id')
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

  const refs: ReferenceImage[] = []

  if (snapshot.baseCreativeId) {
    // Var olan bir görselden türetiliyorsa (Revizyon, Varyasyon veya Görselden Türet):
    // Modele tek odak noktası olarak SADECE seçilen kaynak görsel verilir.
    // Ekstra ürün fotoğrafları veya logo eklenerek modelin kafası karıştırılmaz.
    const { data: base } = await supabase
      .from('creatives')
      .select('public_url, org_id')
      .eq('id', snapshot.baseCreativeId)
      .eq('org_id', creative.org_id)
      .maybeSingle()
    if (base?.public_url) {
      const image = await fetchBuffer(base.public_url)
      if (image) refs.push({ ...image, role: 'base' })
    }
  } else {
    // Sıfırdan yeni üretim:
    // Seçili ürünler arasından ilk ürün görseli referans olarak verilir
    for (const product of snapshot.products) {
      if (refs.length >= 1) break
      if (!product.include.image || !product.imageUrl) continue
      const image = await fetchBuffer(product.imageUrl)
      if (image) refs.push({ ...image, role: 'product' })
    }
  }

  if (snapshot.useLogo && refs.length < MAX_REFS) {
    let logoPath = snapshot.brandKit?.logoPath ?? null
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
        if (image) refs.push({ ...image, role: 'logo' })
      } else {
        const { data: blob } = await supabase.storage.from('brand-assets').download(logoPath)
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
  }

  const { prompt } = buildCreativePrompt(snapshot)
  const aspect = snapshot.aspect || formatToAspect(creative.format)

  try {
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

      if (logoUrl && !logoUrl.startsWith('http')) {
        const { data: pub } = supabase.storage.from('brand-assets').getPublicUrl(logoUrl)
        logoUrl = pub.publicUrl
      }

      // 2. Ürün Görseli veya Kurumsal Hizmet Çözümlemesi
      const chosenProduct = snapshot.products?.[0]
      let productImageUrl = chosenProduct?.imageUrl || null

      // Eğer seçilen ürünün görseli yoksa kütüphanedeki hazır görsellerden destek al
      if (!productImageUrl && creative.org_id) {
        try {
          const { data: latestImg } = await supabase
            .from('creatives')
            .select('public_url')
            .eq('org_id', creative.org_id)
            .eq('status', 'ready')
            .neq('format', 'video')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (latestImg?.public_url) {
            productImageUrl = latestImg.public_url
          }
        } catch (_) {}
      }

      // Eğer ürün görseli bulunamazsa kurumsal logoyu referans olarak kullan
      if (!productImageUrl) {
        productImageUrl = logoUrl
      }

      if (productImageUrl && !productImageUrl.startsWith('http')) {
        const { data: pub } = supabase.storage.from('brand-assets').getPublicUrl(productImageUrl)
        productImageUrl = pub.publicUrl
      }

      const { overlay } = buildVideoPrompt(snapshot)
      let videoPrompt: string
      try {
        const { compileDeterministicV5 } = await import('./v5')
        const v5Result = compileDeterministicV5({
          brandName: overlay.brandName || snapshot.brandKit?.name || null,
          brief: snapshot.brief || 'İşletme reklam filmi',
          customText: snapshot.customText || null,
          ctaText: overlay.ctaText || null,
          campaignDeadline: snapshot.dateRange || null,
          deliveryArea: (snapshot as any).deliveryArea || null,
          cameraMode: (snapshot as any).cameraMode || undefined,
          products: (snapshot.products || []).map((p) => ({
            name: p.name,
            imageUrl: p.imageUrl || productImageUrl,
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
            orgId: creative.org_id,
            prompt: videoPrompt,
            preferredEngine: 'flow',
            engine: 'flow',
            useFlow: true,
            voiceoverText: (snapshot as any).customVoiceover || null,
            brandName: overlay.brandName,
            productName: chosenProduct?.name || null,
            productImageUrl,
            referenceImageUrls: snapshot.referenceImageUrls || [],
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
          return { ok: true, pending: true, retryAfterSeconds: FLOW_POLL_RETRY_SECONDS }
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
      return { ok: true }
    }

    const { image, attempts } = await generateImage(prompt, aspect, bag, refs, {
      customer: customerName,
      workspace: workspaceTitle,
    })
    const ext = image.mimeType.includes('jpeg') ? 'jpg' : 'png'
    const path = `${creative.org_id}/${crypto.randomUUID()}.${ext}`
    const { error: upError } = await supabase.storage.from('creatives').upload(path, image.data, {
      contentType: image.mimeType || 'image/png',
      upsert: false,
    })
    if (upError) throw new Error(upError.message)

    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)
    const size =
      aspect === '16:9'
        ? { width: 1280, height: 720 }
        : aspect === '9:16'
          ? { width: 1024, height: 1820 }
          : aspect === '4:5'
            ? { width: 1024, height: 1280 }
            : { width: 1024, height: 1024 }

    const nextPayload: CreativePayload = {
      ...snapshot,
      originalPrompt: snapshot.brief,
      generatedPrompt: prompt,
      provider: image.provider,
      attempts: attempts.length ? attempts : null,
      cost: { provider: image.provider, imageCount: 1 },
    }

    const { error } = await supabase
      .from('creatives')
      .update({
        status: 'ready',
        error: null,
        storage_path: path,
        public_url: publicUrl.publicUrl,
        width: size.width,
        height: size.height,
        payload: nextPayload,
      })
      .eq('id', creativeId)
      .eq('org_id', creative.org_id)

    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (error) {
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
