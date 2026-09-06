import { NextResponse } from 'next/server'
import { generateImage, hasImageProvider } from '@/lib/ai/image'
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

/**
 * Hızlı gönderim / kampanya için kare WhatsApp görseli.
 * Marka kiti şablonu değil — düz AI görsel + Storage public URL.
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

  if (!hasImageProvider()) {
    return NextResponse.json(
      {
        error:
          'Görsel üretimi kapalı. Sunucuya OPENAI_API_KEY, GEMINI_API_KEY, CLOUDFLARE_* veya Pollinations yapılandırın.',
      },
      { status: 503 },
    )
  }

  let body: { brief?: string; brand?: string; style?: string }
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

  const brand = String(body.brand ?? '').trim()
  const styleKey = String(body.style ?? 'duyuru').trim()
  const style = STYLE_HINT[styleKey] ?? STYLE_HINT.duyuru

  const prompt = [
    'WhatsApp marketing image, square 1:1, high quality, Turkish audience, no watermarks.',
    'Do not fill the image with long readable paragraphs; at most a short slogan if any.',
    style,
    brand ? `Brand context: ${brand}.` : null,
    `Subject: ${brief}`,
  ]
    .filter(Boolean)
    .join(' ')

  try {
    const { image, attempts } = await generateImage(prompt, '1:1')
    const path = `${org.id}/${crypto.randomUUID()}.png`

    const { error: uploadError } = await supabase.storage.from('creatives').upload(path, image.data, {
      contentType: image.mimeType || 'image/png',
      upsert: false,
    })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)

    // Galeri kaydı başarısız olsa da URL kullanılabilir olsun.
    void supabase.from('creatives').insert({
      org_id: org.id,
      created_by: userId,
      brand_kit_id: null,
      template: 'ai_send',
      format: 'square',
      payload: {
        brief,
        brand: brand || null,
        style: styleKey,
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
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Görsel üretilemedi.' },
      { status: 502 },
    )
  }
}
