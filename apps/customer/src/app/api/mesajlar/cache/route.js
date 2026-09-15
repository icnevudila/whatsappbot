import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { syncChatMessage } from '@/lib/chat-store'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { org } = await requireActiveOrg()
    const payload = await request.json()
    const phone = typeof payload?.phone === 'string' ? payload.phone : ''
    const message = payload?.message
    if (!phone || !message) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    await syncChatMessage(org.id, phone, message, payload.preview ?? null)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}
