import { NextResponse } from 'next/server'
import { generateImage, hasImageProvider } from '@/lib/ai/image'
import { loadOrgAiKeys, rowToBag } from '@/lib/ai/org-keys'
import { DEFAULT_COLORS, type BrandColors } from '@/lib/creative-templates'
import { rateLimit } from '@/lib/rate-limit'
import { requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'
export const maxDuration = 60

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

  const limited = rateLimit(`ai:gorsel:${userId}`, { limit: 8, windowMs: 60_000 })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Biraz bekleyin.' },
      { status: 429, headers: { 'retry-after': String(limited.retryAfterSec) } },
    )
  }

  const aiBag = rowToBag(await loadOrgAiKeys(supabase, org.id))

  if (!hasImageProvider(aiBag)) {
    return NextResponse.json(
      {
        error:
          'Görsel üretimi kapalı. Ayarlar → Yapay zeka’dan OpenAI / Gemini anahtarı girin (veya Pollinations yedek).',
      },
      { status: 503 },
    )
  }

  let body: { brief?: string; brand?: string; style?: string; brandKitId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const brief = String(body.brief ?? '').trim()
  if (brief.length < 8) {
    return NextResponse.json(
      { error: 'Ne çizileceğini en az bir cümleyle yazın.' },
      { status: 400 },
    )
  }

  const requestedKitId = String(body.brandKitId ?? '').trim() || null
  let kit: {
    id: string
    name: string
    colors: unknown
    tone: string | null
  } | null = null

  if (requestedKitId) {
    const { data } = await supabase
      .from('brand_kits')
      .select('id, name, colors, tone')
      .eq('org_id', org.id)
      .eq('id', requestedKitId)
      .maybeSingle()
    kit = data
    if (!kit) {
      return NextResponse.json({ error: 'Marka kiti bulunamadı.' }, { status: 404 })
    }
  } else {
    const { data } = await supabase
      .from('brand_kits')
      .select('id, name, colors, tone')
      .eq('org_id', org.id)
      .eq('is_default', true)
      .maybeSingle()
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
    const { image, attempts } = await generateImage(prompt, '1:1', aiBag)
    const path = `${org.id}/${crypto.randomUUID()}.png`

    const { error: uploadError } = await supabase.storage.from('creatives').upload(path, image.data, {
      contentType: image.mimeType || 'image/png',
      upsert: false,
    })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)

    void supabase.from('creatives').insert({
      org_id: org.id,
      created_by: userId,
      brand_kit_id: kit?.id ?? null,
      template: 'ai_send',
      format: 'square',
      payload: {
        brief,
        brand: brandName || null,
        style: styleKey,
        brand_kit_id: kit?.id ?? null,
        provider: image.provider,
        attempts: attempts.length ? attempts : null,
      },
      storage_path: path,
      public_url: publicUrl.publicUrl,
      width: 1024,
      height: 1024,
      status: 'ready',
    })

    return NextResponse.json({
      url: publicUrl.publicUrl,
      provider: image.provider,
      brandKitId: kit?.id ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Görsel üretilemedi.' },
      { status: 502 },
    )
  }
}
