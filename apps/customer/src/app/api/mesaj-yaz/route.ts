import { NextResponse } from 'next/server'
import { completeText, hasTextProvider } from '@/lib/ai/text'
import {
  buildGeneratePrompt,
  buildRewritePrompt,
  CAMPAIGN_GENERATE_SYSTEM,
  cleanAiMessage,
  isRewriteAction,
  type BusinessContext,
} from '@/lib/ai/campaign-message'
import { rateLimit } from '@/lib/rate-limit'
import { requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'

async function loadBusinessContext(
  orgId: string,
  supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase'],
  fallbackName: string,
): Promise<BusinessContext> {
  const [orgRow, kitRow] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, about, address, phone_e164')
      .eq('id', orgId)
      .maybeSingle(),
    supabase
      .from('brand_kits')
      .select('name, tone')
      .eq('org_id', orgId)
      .eq('is_default', true)
      .maybeSingle(),
  ])

  return {
    name: orgRow.data?.name || kitRow.data?.name || fallbackName,
    about: orgRow.data?.about,
    address: orgRow.data?.address,
    phone: orgRow.data?.phone_e164,
    tone: kitRow.data?.tone,
  }
}

export async function POST(request: Request) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let userId: string
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch {
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
  }

  if (org.suspended_at) {
    return NextResponse.json({ error: 'İşletme askıda.' }, { status: 403 })
  }

  const limited = rateLimit(`ai:mesaj:${userId}`, { limit: 20, windowMs: 60_000 })
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
          'Metin üretimi kapalı. Sunucu ortamında OpenAI veya Gemini anahtarı tanımlı değil.',
      },
      { status: 503 },
    )
  }

  let body: {
    mode?: string
    brief?: string
    brand?: string
    tone?: string
    currentMessage?: string
    action?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const mode = body.mode === 'rewrite' ? 'rewrite' : 'generate'
  const brief = String(body.brief ?? '').trim()
  const currentMessage = String(body.currentMessage ?? '').trim()
  const tone = String(body.tone ?? '').trim()
  const actionRaw = String(body.action ?? '').trim()

  if (mode === 'generate' && brief.length < 8) {
    return NextResponse.json(
      { error: 'Kampanyanızdan kısaca bahsedin.' },
      { status: 400 },
    )
  }
  if (mode === 'rewrite') {
    if (currentMessage.length < 4) {
      return NextResponse.json({ error: 'Önce bir mesaj yazın.' }, { status: 400 })
    }
    if (!isRewriteAction(actionRaw)) {
      return NextResponse.json({ error: 'Geçersiz iyileştirme seçeneği.' }, { status: 400 })
    }
  }

  const business = await loadBusinessContext(org.id, supabase, String(body.brand ?? org.name))

  const prompt =
    mode === 'rewrite' && isRewriteAction(actionRaw)
      ? buildRewritePrompt({ currentMessage, action: actionRaw, brief, business })
      : buildGeneratePrompt({ brief, tone, business })

  try {
    const text = await completeText(CAMPAIGN_GENERATE_SYSTEM, prompt)
    return NextResponse.json({ text: cleanAiMessage(text) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Metin üretilemedi.' },
      { status: 502 },
    )
  }
}
