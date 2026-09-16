import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 45

type Suggestion = { label: string; text: string }

function normalizeForLibrary(input: string) {
  return input
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
}

function fingerprint(input: string) {
  return createHash('sha256').update(normalizeForLibrary(input)).digest('hex')
}

function shouldHistoryAffectCache(message: string) {
  const normalized = normalizeForLibrary(message)
  if (normalized.length < 18) return true
  return /\b(o|onu|bunu|şunu|su|bu|evet|hayır|hayir|tamam|peki|olur|kaç|kac)\b/u.test(normalized)
}

function validSuggestions(value: unknown): value is Suggestion[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as Suggestion).label === 'string' &&
        typeof (item as Suggestion).text === 'string' &&
        (item as Suggestion).text.trim().length > 0,
    )
  )
}

function formatKnowledgeContext(rows: unknown): string {
  if (!Array.isArray(rows) || rows.length === 0) return ''
  const lines = rows.slice(0, 8).map((row) => {
    const item = row as {
      product_name?: string | null
      price_amount?: string | number | null
      currency?: string | null
      raw_text?: string | null
      source_media_url?: string | null
    }
    const price =
      item.price_amount != null
        ? ` fiyat: ${Number(item.price_amount).toLocaleString('tr-TR')} ${item.currency || 'TRY'}`
        : ''
    const product = item.product_name || 'Görseldeki/son paylaşılan ürün'
    const media = item.source_media_url ? ' (görsel kaynağı var)' : ''
    const raw = item.raw_text ? `; not: ${item.raw_text.slice(0, 140)}` : ''
    return `- ${product}${price}${media}${raw}`
  })
  return `Öğrenilen ürün/fiyat bilgileri:\n${lines.join('\n')}`
}

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
    companyContext += `. Ürünler/Hizmetler: ${products.data.map((p) => p.name).join(', ')}`
  }

  const { data: knowledgeRows } = await (supabase as any)
    .from('reply_product_knowledge')
    .select('product_name, price_amount, currency, raw_text, source_media_url')
    .eq('org_id', org.id)
    .order('last_seen_at', { ascending: false })
    .limit(8)
  const knowledgeContext = formatKnowledgeContext(knowledgeRows)
  if (knowledgeContext) companyContext += `\n${knowledgeContext}`

  const tone = kitRow.data?.tone || 'Kurumsal, nazik, yardımsever ve samimi'
  const historyForCache = shouldHistoryAffectCache(lastMessage) ? body.history || '' : ''
  const messageFingerprint = fingerprint(lastMessage)
  const contextFingerprint = fingerprint(`${companyContext}\n${tone}\n${historyForCache}`)

  const { data: cached } = await supabase
    .from('ai_reply_suggestion_library')
    .select('id, suggestions, hit_count')
    .eq('org_id', org.id)
    .eq('message_fingerprint', messageFingerprint)
    .eq('context_fingerprint', contextFingerprint)
    .maybeSingle()

  let cachedRow = cached
  if (!cachedRow) {
    const { data: fallback } = await supabase
      .from('ai_reply_suggestion_library')
      .select('id, suggestions, hit_count')
      .eq('org_id', org.id)
      .eq('message_fingerprint', messageFingerprint)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (fallback) cachedRow = fallback
  }

  if (cachedRow && validSuggestions(cachedRow.suggestions)) {
    void supabase
      .from('ai_reply_suggestion_library')
      .update({
        hit_count: Number(cachedRow.hit_count ?? 0) + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cachedRow.id)

    return NextResponse.json({ success: true, cached: true, suggestions: cachedRow.suggestions })
  }

  const limited = rateLimit(`ai:suggest:${userId}`, { limit: 15, windowMs: 60_000 })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Biraz bekleyin.' },
      { status: 429, headers: { 'retry-after': String(limited.retryAfterSec) } },
    )
  }

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
      suggestions?: Suggestion[]
      error?: string
    }

    if (!validSuggestions(data.suggestions)) {
      return NextResponse.json({ error: data.error || 'Öneri üretilemedi.' }, { status: 500 })
    }

    await supabase.from('ai_reply_suggestion_library').upsert(
      {
        org_id: org.id,
        message_fingerprint: messageFingerprint,
        context_fingerprint: contextFingerprint,
        incoming_sample: lastMessage.slice(0, 500),
        suggestions: data.suggestions,
        source: 'chatgpt',
        generated_count: 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,message_fingerprint,context_fingerprint' },
    )

    return NextResponse.json({ success: true, cached: false, suggestions: data.suggestions })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Yapay zeka servisine erişilemedi.', details: message },
      { status: 504 },
    )
  }
}
