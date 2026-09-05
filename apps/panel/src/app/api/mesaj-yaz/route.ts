import { NextResponse } from 'next/server'
import { completeText, hasTextProvider } from '@/lib/ai/text'
import { rateLimit } from '@/lib/rate-limit'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Kampanya mesaji yazdirma ucu.
 *
 * Sistem istemi bilinçli olarak sinirlayici: WhatsApp toplu gonderiminde
 * uzun ve reklam kokan metinler sikayet oranini yukseltiyor, sikayet de
 * dogrudan hattin kilitlenmesine yol aciyor. Bu yuzden modele kisa tutmayi,
 * cikma yolunu yazmayi ve emoji yigmamayi acikca soyluyoruz.
 */
const SYSTEM = `Sen Turkiye'de calisan bir WhatsApp kampanya metni yazarisin.

Kurallar:
- Turkce yaz, samimi ama abartisiz bir ton kullan.
- En fazla 4 kisa satir, toplam 320 karakteri gecme.
- En basta kim oldugunu belirt (marka adi verildiyse kullan).
- Somut bir fayda ver: indirim orani, tarih, urun.
- Sonuna tek satir cikma yolu ekle: "Mesaj almak istemiyorsaniz YAZMAYIN yazin."
- En fazla 2 emoji kullan, satir basina birden fazla koyma.
- BUYUK HARFLE BAGIRMA, unlem yigma.
- Kisi adini kullanacaksan tam olarak {{ad}} yaz, baska bir bicim kullanma.
- Yalnizca mesaj metnini dondur. Aciklama, baslik, tirnak veya madde imi ekleme.`

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum bulunamadi.' }, { status: 401 })
  }

  const limited = rateLimit(`ai:mesaj:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Biraz bekleyin.' },
      { status: 429, headers: { 'retry-after': String(limited.retryAfterSec) } },
    )
  }

  if (!hasTextProvider()) {
    return NextResponse.json(
      {
        error:
          'Metin uretimi kapali. Sunucuya OPENAI_API_KEY veya GEMINI_API_KEY ekleyin.',
      },
      { status: 503 },
    )
  }

  let body: { brief?: string; brand?: string; tone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const brief = String(body.brief ?? '').trim()
  if (!brief) {
    return NextResponse.json(
      { error: 'Ne göndermek istediğinizi bir cümleyle yazın.' },
      { status: 400 },
    )
  }

  const brand = String(body.brand ?? '').trim()
  const tone = String(body.tone ?? '').trim()

  const prompt = [
    `Kampanya: ${brief}`,
    brand ? `Marka adı: ${brand}` : null,
    tone ? `İstenen ton: ${tone}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const text = await completeText(SYSTEM, prompt)

    // Model bazen metni tırnak içine alıyor; kullanıcıya öyle göstermek
    // mesaja tırnak kopyalamasına yol açıyor.
    const cleaned = text.replace(/^["'`\s]+|["'`\s]+$/g, '')

    return NextResponse.json({ text: cleaned })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Metin üretilemedi.' },
      { status: 502 },
    )
  }
}
