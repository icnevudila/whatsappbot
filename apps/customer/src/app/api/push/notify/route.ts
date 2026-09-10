import { NextResponse } from 'next/server'
import { notifyOrgUsers } from '@/lib/push/fcm'

export const runtime = 'nodejs'

/**
 * Worker / internal: org push fan-out.
 * Auth: Authorization: Bearer $PUSH_DISPATCH_SECRET
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'PUSH_DISPATCH_SECRET yok' }, { status: 503 })
  }
  const auth = request.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  let body: { orgId?: string; title?: string; body?: string; path?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz gövde' }, { status: 400 })
  }

  const orgId = String(body.orgId ?? '').trim()
  const title = String(body.title ?? '').trim()
  const text = String(body.body ?? '').trim()
  const path = body.path ? String(body.path).trim() : undefined
  if (!orgId || !title || !text) {
    return NextResponse.json({ error: 'orgId, title, body zorunlu' }, { status: 400 })
  }

  const result = await notifyOrgUsers(orgId, { title, body: text, path })
  return NextResponse.json(result)
}
