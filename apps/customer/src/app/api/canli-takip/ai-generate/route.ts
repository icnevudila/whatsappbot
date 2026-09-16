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

    if (hasTextProvider()) {
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
    }

    // Hetzner VPS OmniStudio / ChatGPT mikroservisinden anlık öneri al
    const gatewayUrl = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')
    const gatewayRes = await fetch(`${gatewayUrl}/v1/chat/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: businessName,
        incomingMessage: prompt,
        companyContext: `${businessName} WhatsApp Pazarlama ve Müşteri Destek`,
        tone,
      }),
      signal: AbortSignal.timeout(45000),
    })

    if (!gatewayRes.ok) {
      throw new Error(`AI motoru HTTP ${gatewayRes.status} yanıtı döndürdü.`)
    }

    const data = (await gatewayRes.json()) as {
      success?: boolean
      suggestions?: Array<{ label: string; text: string }>
      error?: string
    }

    if (!data.suggestions || data.suggestions.length === 0) {
      throw new Error(data.error || 'AI motoru öneri üretemedi.')
    }

    const firstSuggestion = data.suggestions[0]?.text || ''
    const allFormatted = data.suggestions.map(s => `[${s.label}]\n${s.text}`).join('\n\n')

    return NextResponse.json({
      success: true,
      text: allFormatted,
      firstSuggestion,
      suggestions: data.suggestions,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Üretim başarısız' },
      { status: 500 },
    )
  }
}
