import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 45

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

  const limited = rateLimit(`ai:suggest:${userId}`, { limit: 15, windowMs: 60_000 })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Biraz bekleyin.' },
      { status: 429, headers: { 'retry-after': String(limited.retryAfterSec) } },
    )
  }

  let body: {
    phone?: string
    lastMessage?: string
    history?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const lastMessage = (body.lastMessage || '').trim()
  if (!lastMessage) {
    return NextResponse.json({ error: 'Yanıtlanacak mesaj bulunamadı.' }, { status: 400 })
  }

  // İşletme bağlamını topla
  const [kitRow, products] = await Promise.all([
    supabase
      .from('brand_kits')
      .select('name, tone')
      .eq('org_id', org.id)
      .eq('is_default', true)
      .maybeSingle(),
    supabase
      .from('org_products')
      .select('name, description')
      .eq('org_id', org.id)
      .eq('is_active', true)
      .limit(6),
  ])

  let companyContext = org.name
  if (kitRow.data?.name && kitRow.data.name !== org.name) {
    companyContext += ` (${kitRow.data.name})`
  }
  if (products.data && products.data.length > 0) {
    const productList = products.data.map((p) => p.name).join(', ')
    companyContext += `. Ürünler/Hizmetler: ${productList}`
  }

  const tone = kitRow.data?.tone || 'Kurumsal, nazik, yardımsever ve samimi'
  const gatewayUrl = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')

  try {
    const gatewayRes = await fetch(`${gatewayUrl}/v1/chat/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: org.name,
        incomingMessage: lastMessage,
        conversationHistory: body.history || '',
        companyContext,
        tone,
      }),
      signal: AbortSignal.timeout(35000),
    })

    if (!gatewayRes.ok) {
      const errText = await gatewayRes.text().catch(() => '')
      return NextResponse.json(
        { error: 'AI motorundan yanıt alınamadı.', details: errText },
        { status: 502 },
      )
    }

    const data = (await gatewayRes.json()) as {
      success?: boolean
      suggestions?: Array<{ label: string; text: string }>
      error?: string
    }

    if (!data.suggestions || data.suggestions.length === 0) {
      return NextResponse.json(
        { error: data.error || 'Öneri üretilemedi.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      suggestions: data.suggestions,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Yapay zeka servisine erişilemedi.', details: message },
      { status: 504 },
    )
  }
}
