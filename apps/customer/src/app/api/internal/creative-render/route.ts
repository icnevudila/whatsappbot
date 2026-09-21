import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { processCreativeGeneration } from '@/lib/creative/process'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const maxDuration = 180

function matchesSecret(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

async function authorized(request: Request, creativeId: string): Promise<boolean> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  const secret = process.env.JOB_INTERNAL_SECRET?.trim()
  if (secret && matchesSecret(token, secret)) return true

  const workerJobId = request.headers.get('x-creative-job-id')?.trim()
  if (!workerJobId || !token) return false

  // Vercel'deki service-role yalnız sunucuda kullanılır. Böylece VPS'te global
  // bir panel sırrı saklamadan yalnız kuyruktaki tek işi çalıştırabiliriz.
  const supabase = createSupabaseServiceClient()
  if (!supabase) return false
  const { data, error } = await supabase
    .from('jobs')
    .select('type, payload, status')
    .eq('id', workerJobId)
    .maybeSingle()
  if (error || !data || data.type !== 'creative.render') return false

  const payload = data.payload as { creative_id?: unknown; callback_token?: unknown } | null
  const expectedToken = typeof payload?.callback_token === 'string' ? payload.callback_token : ''
  const expectedCreativeId = typeof payload?.creative_id === 'string' ? payload.creative_id : ''
  return Boolean(expectedToken && expectedCreativeId === creativeId && matchesSecret(token, expectedToken))
}

/** Worker → müşteri uygulaması. Sekme kapansa bile üretim burada biter. */
export async function POST(request: Request) {
  let body: { creativeId?: string }
  try {
    body = (await request.json()) as { creativeId?: string }
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const creativeId = String(body.creativeId ?? '').trim()
  if (!creativeId) {
    return NextResponse.json({ error: 'creativeId gerekli.' }, { status: 400 })
  }

  if (!(await authorized(request, creativeId))) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 })
  }

  const result = await processCreativeGeneration(creativeId)
  if (result.pending) {
    return NextResponse.json(
      { ok: true, pending: true, retryAfterSeconds: result.retryAfterSeconds ?? 15 },
      { status: 202 },
    )
  }
  if (result.busy) {
    return NextResponse.json({ error: result.error ?? 'Üretim sürüyor.' }, { status: 503 })
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Üretim başarısız.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, skipped: result.skipped ?? false })
}
