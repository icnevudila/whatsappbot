import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { completeText, hasTextProvider } from '@/lib/ai/text'
import { cleanAiMessage, CAMPAIGN_GENERATE_SYSTEM } from '@/lib/ai/campaign-message'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim.' },
        { status: 401 },
      )
    }

    const body = await req.json()
    const { prompt, tone = 'samimi', businessName = 'Mesajify' } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Lütfen bir prompt veya ürün açıklaması girin.' },
        { status: 400 },
      )
    }

    if (!hasTextProvider()) {
      return NextResponse.json(
        { success: false, error: 'AI sağlayıcı yapılandırması (OpenAI/Gemini) eksik.' },
        { status: 500 },
      )
    }

    const systemPrompt = `${CAMPAIGN_GENERATE_SYSTEM}
İşletme Adı: ${businessName}
Ton: ${tone}
Görev: Aşağıda verilen ürün, kampanya veya duyuru için WhatsApp pazarlamasında yüksek dönüşüm alacak, profesyonel, emoji içermeyen (veya sadece 1-2 çok sade ikonlu), doğrudan harekete geçirici (CTA) bir WhatsApp mesaj metni oluştur.`

    const rawText = await completeText(systemPrompt, prompt)
    const cleaned = cleanAiMessage(rawText)

    return NextResponse.json({
      success: true,
      text: cleaned,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Üretim başarısız' },
      { status: 500 },
    )
  }
}
