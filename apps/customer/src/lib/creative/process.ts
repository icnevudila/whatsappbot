import type { SupabaseClient } from '@supabase/supabase-js'
import { generateImage, type ReferenceImage } from '@/lib/ai/image'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { buildCreativePrompt } from './prompt'
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
  }

  if (snapshot.useLogo && snapshot.brandKit?.logoPath) {
    const path = snapshot.brandKit.logoPath
    if (path.startsWith('http')) {
      const image = await fetchBuffer(path)
      if (image) refs.push({ ...image, role: 'logo' })
    } else {
      const { data: signed } = await supabase.storage
        .from('brand-assets')
        .createSignedUrl(path, 120)
      if (signed?.signedUrl) {
        const image = await fetchBuffer(signed.signedUrl)
        if (image) refs.push({ ...image, role: 'logo' })
      }
    }
  }

  for (const product of snapshot.products) {
    if (refs.length >= MAX_REFS) break
    if (!product.include.image || !product.imageUrl) continue
    const image = await fetchBuffer(product.imageUrl)
    if (image) refs.push({ ...image, role: 'product' })
  }

  const { prompt } = buildCreativePrompt(snapshot)
  const aspect = snapshot.aspect || formatToAspect(creative.format)

  try {
    const { image, attempts } = await generateImage(prompt, aspect, null, refs)
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
