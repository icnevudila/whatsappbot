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

export async function processCreativeGeneration(
  creativeId: string,
  client?: SupabaseClient | null,
): Promise<{
  ok: boolean
  skipped?: boolean
  busy?: boolean
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
  if (creative.status === 'ready' && creative.public_url) {
    return { ok: true, skipped: true }
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

  const snapshot = asSnapshot(creative.payload)
  if (!snapshot) {
    await supabase
      .from('creatives')
      .update({ status: 'failed', error: 'Üretim özeti eksik.' })
      .eq('id', creativeId)
    return { ok: false, error: 'Üretim özeti eksik.' }
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
      const { prompt: videoPrompt, overlay } = buildVideoPrompt(snapshot)
      const gatewayUrl = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')

      const vidRes = await fetch(`${gatewayUrl}/v1/videos/generations`, {
        method: 'POST',
        signal: AbortSignal.timeout(300000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          brandName: overlay.brandName,
          productName: snapshot.products[0]?.name || null,
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
        throw new Error(`OmniStudio Video ${vidRes.status}: ${(await vidRes.text()).slice(0, 200)}`)
      }

      const vidJson = (await vidRes.json()) as {
        data?: { url?: string; thumbnailUrl?: string }[]
        videoId?: string
        thumbnailUrl?: string
      }
      const videoUrl = vidJson.data?.[0]?.url
      if (!videoUrl) throw new Error('Video URL alınamadı')

      const rawThumbUrl = vidJson.thumbnailUrl || vidJson.data?.[0]?.thumbnailUrl

      const fileRes = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) })
      if (!fileRes.ok) throw new Error('Üretilen video indirilemedi')
      const videoBuffer = Buffer.from(await fileRes.arrayBuffer())

      const storagePath = `${creative.org_id}/${crypto.randomUUID()}.mp4`
      const { error: upErr } = await supabase.storage.from('creatives').upload(storagePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      })
      if (upErr) throw new Error(upErr.message)

      const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(storagePath)

      let uploadedThumbnailUrl: string | null = null
      if (rawThumbUrl) {
        try {
          const thumbRes = await fetch(rawThumbUrl, { signal: AbortSignal.timeout(15000) })
          if (thumbRes.ok) {
            const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer())
            const thumbPath = `${creative.org_id}/${crypto.randomUUID()}_thumb.jpg`
            const { error: thumbErr } = await supabase.storage.from('creatives').upload(thumbPath, thumbBuffer, {
              contentType: 'image/jpeg',
              upsert: false,
            })
            if (!thumbErr) {
              const { data: thumbPub } = supabase.storage.from('creatives').getPublicUrl(thumbPath)
              uploadedThumbnailUrl = thumbPub.publicUrl
            }
          }
        } catch (err) {
          console.warn('[creative.video.thumbnail]', err)
        }
      }

      const nextPayload: CreativePayload = {
        ...snapshot,
        originalPrompt: snapshot.brief,
        generatedPrompt: videoPrompt,
        provider: 'omnistudio_veo',
        thumbnailUrl: uploadedThumbnailUrl || rawThumbUrl || null,
        cost: { provider: 'omnistudio_veo', imageCount: 1 },
      }

      const { error: dbErr } = await supabase
        .from('creatives')
        .update({
          status: 'ready',
          error: null,
          storage_path: storagePath,
          public_url: publicUrl.publicUrl,
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
