import { NextResponse } from 'next/server'
import { hasImageProvider } from '@/lib/ai/image'
import { processCreativeGeneration } from '@/lib/creative/process'
import { continueQuickImageJob, ensureQuickImageRecord, ownsQuickImage, quickImageIdentity } from '@/lib/creative/quick-image-job'
import type { CreativePayload } from '@/lib/creative/types'
import { DEFAULT_COLORS, type BrandColors } from '@/lib/creative-templates'
import { rateLimit } from '@/lib/rate-limit'
import { requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'
export const maxDuration = 180

/** Account-scoped local recovery identity; this never starts production. */
export async function GET() {
  try {
    const { userId, org } = await requireActiveOrg()
    return NextResponse.json({ requestScope: `${org.id}:${userId}` }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 }) }
}

const STYLE_HINT: Record<string, string> = {
  urun: 'clean product photography, soft studio light, shallow depth of field',
  duyuru: 'bright promotional poster look, bold simple composition, no tiny text',
  minimal: 'minimal flat design, generous whitespace, soft pastel background',
  fotograf: 'realistic lifestyle photograph, natural lighting, candid feel',
}

function colorsPrompt(colors: BrandColors): string {
  return [
    `primary ${colors.primary}`,
    `secondary ${colors.secondary}`,
    `accent ${colors.accent}`,
    `background ${colors.background}`,
    `text ${colors.text}`,
  ].join(', ')
}

/**
 * Hızlı gönderim / kampanya için kare WhatsApp görseli.
 * Marka kiti varsa renk + ton + ad prompta işlenir.
 */
export async function POST(request: Request) {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch {
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
  }

  if (org.suspended_at) {
    return NextResponse.json({ error: 'İşletme askıda.' }, { status: 403 })
  }

  let body: { requestId?: string; requestScope?: string; brief?: string; brand?: string; style?: string; brandKitId?: string | null }
  try {
    body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body')
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }
  if (body.requestScope !== `${org.id}:${userId}`) {
    return NextResponse.json({ error: 'Etkin işletme veya hesap değişti. Mevcut işi doğru işletmede kontrol edin.', canRetryNew: false }, { status: 409 })
  }

  const brief = String(body.brief ?? '').trim()
  const requestId = String(body.requestId || '').trim()
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)) {
    return NextResponse.json({ error: 'Kalıcı üretim kimliği gerekli.', canRetryNew: true }, { status: 400 })
  }
  if (brief.length < 8) {
    return NextResponse.json(
      { error: 'Ne çizileceğini en az bir cümleyle yazın.' },
      { status: 400 },
    )
  }

  const requestedKitId = String(body.brandKitId ?? '').trim() || null
  const identity = quickImageIdentity({ brief, brand: String(body.brand || ''), style: String(body.style || 'duyuru'), brandKitId: requestedKitId })
  const existing = await supabase.from('creatives').select('id,org_id,created_by,source,template,format,status,payload,public_url,error')
    .eq('id', requestId).eq('org_id', org.id).maybeSingle()
  if (existing.error) return NextResponse.json({ error: 'İş kaydı doğrulanamadı; aynı kimlikle tekrar kontrol edin.', canRetryNew: false }, { status: 503 })
  if (existing.data) {
    if (!ownsQuickImage(existing.data, org.id, userId, identity)) return NextResponse.json({ error: 'Üretim kimliği farklı bir işe ait.', canRetryNew: false }, { status: 409 })
    return continueQuickImage(requestId, supabase, org.id)
  }
  if (!hasImageProvider()) return NextResponse.json({ error: 'Görsel üretimi kapalı.', canRetryNew: false }, { status: 503 })
  const limited = rateLimit(`ai:gorsel:${userId}`, { limit: 8, windowMs: 60_000 })
  if (!limited.ok) return NextResponse.json({ error: 'Çok fazla istek. Biraz bekleyin.', canRetryNew: false },
    { status: 429, headers: { 'retry-after': String(limited.retryAfterSec) } })
  let kit: {
    id: string
    name: string
    colors: unknown
    tone: string | null
    logo_path: string | null
  } | null = null

  if (requestedKitId) {
    const { data, error } = await supabase
      .from('brand_kits')
      .select('id, name, colors, tone, logo_path')
      .eq('org_id', org.id)
      .eq('id', requestedKitId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Seçilen marka kiti doğrulanamadı; üretim başlatılmadı.', canRetryNew: false }, { status: 503 })
    kit = data
    if (!kit) {
      return NextResponse.json({ error: 'Marka kiti bulunamadı.' }, { status: 404 })
    }
  } else {
    const { data, error } = await supabase
      .from('brand_kits')
      .select('id, name, colors, tone, logo_path')
      .eq('org_id', org.id)
      .eq('is_default', true)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Marka kiti doğrulanamadı; üretim başlatılmadı.', canRetryNew: false }, { status: 503 })
    kit = data
  }

  const fallbackBrand = String(body.brand ?? '').trim()
  const styleKey = String(body.style ?? 'duyuru').trim()
  const style = STYLE_HINT[styleKey] ?? STYLE_HINT.duyuru

  const colors: BrandColors = {
    ...DEFAULT_COLORS,
    ...((kit?.colors as Partial<BrandColors> | null) ?? {}),
  }

  const brandName = kit?.name?.trim() || fallbackBrand
  const tone = kit?.tone?.trim() || null

  const prompt = [
    'WhatsApp marketing image, square 1:1, high quality, Turkish audience, no watermarks.',
    'Do not fill the image with long readable paragraphs; at most a short slogan if any.',
    style,
    brandName ? `Brand name / business: ${brandName}.` : null,
    tone ? `Brand tone of voice / mood: ${tone}.` : null,
    kit
      ? `Follow this brand color palette closely in backgrounds, props and accents: ${colorsPrompt(colors)}.`
      : null,
    kit ? 'Keep visual identity consistent with an existing brand kit (colors and mood).' : null,
    `Subject: ${brief}`,
  ]
    .filter(Boolean)
    .join(' ')

  try {
    const logoResult = await supabase.from('organizations').select('logo_path').eq('id', org.id).maybeSingle()
    if (logoResult.error) throw new Error('İşletme logosu doğrulanamadı; üretim başlatılmadı.')
    const logoPath = kit?.logo_path || logoResult.data?.logo_path || null
    const payload: CreativePayload = {
      brief, style: styleKey, formatId: 'square', aspect: '1:1', textDensity: 'low', useLogo: Boolean(logoPath),
      labels: [], cta: null, address: null, website: null, dateRange: null, customText: null,
      phones: [], socials: [], products: [], baseCreativeId: null,
      brandKit: kit ? { id: kit.id, name: kit.name, tone: kit.tone, colors, fonts: {}, logoPath } : null,
      quickSendPrompt: prompt, quickSendIdentity: identity,
      ...(logoPath && !kit ? { customLogoUrl: logoPath } : {}),
    }
    await ensureQuickImageRecord(supabase, {
      id: requestId,
      org_id: org.id,
      created_by: userId,
      brand_kit_id: kit?.id ?? null,
      title: brief.slice(0, 80) || 'Kampanya görseli',
      source: 'ai',
      generation_type: 'new',
      template: 'ai_send',
      format: 'square',
      payload, status: 'pending',
    }, identity)
    return continueQuickImage(requestId, supabase, org.id)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Görsel üretilemedi.', canRetryNew: false, creativeId: requestId },
      { status: 502 },
    )
  }
}

async function continueQuickImage(id: string, supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase'], orgId: string) {
  try {
    const result = await continueQuickImageJob(supabase, id, orgId, () => processCreativeGeneration(id, supabase))
    return NextResponse.json(result.body, { status: result.status })
  } catch {
    return NextResponse.json({ error: 'Mevcut işin sonucu doğrulanamadı; aynı kimlikle kontrol edin.',
      creativeId: id, canRetryNew: false }, { status: 503 })
  }
}
