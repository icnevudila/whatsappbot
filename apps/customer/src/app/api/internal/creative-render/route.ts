import { NextResponse } from 'next/server'
import { processCreativeGeneration } from '@/lib/creative/process'

export const runtime = 'nodejs'
export const maxDuration = 120

function authorized(request: Request): boolean {
  const secret = process.env.JOB_INTERNAL_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

/** Worker → müşteri uygulaması. Sekme kapansa bile üretim burada biter. */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 })
  }

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

  const result = await processCreativeGeneration(creativeId)
  if (result.busy) {
    return NextResponse.json({ error: result.error ?? 'Üretim sürüyor.' }, { status: 503 })
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Üretim başarısız.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, skipped: result.skipped ?? false })
}
