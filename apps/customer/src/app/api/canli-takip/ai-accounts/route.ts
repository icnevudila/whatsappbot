import { NextResponse } from 'next/server'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://167.233.201.31:3456'

export async function GET() {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const res = await fetch(`${GATEWAY_URL}/v1/ai-engine/status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'Gateway yanıt vermedi' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, ...data })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Bağlantı hatası' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const isAuth = await checkIsAuthenticated()
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body = await req.json()
    const { action, port, name, flowProjectUrl } = body

    if (action === 'verify') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
        signal: AbortSignal.timeout(12000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'reset_limit') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/reset-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port }),
        signal: AbortSignal.timeout(5000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'provision') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, name, flowProjectUrl }),
        signal: AbortSignal.timeout(8000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'update_flow') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const { flowCredits } = body
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/update-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, flowProjectUrl, flowCredits }),
        signal: AbortSignal.timeout(8000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'sync_cookies') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const { cookies, platform } = body
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/sync-cookies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, cookies, platform }),
        signal: AbortSignal.timeout(15000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    if (action === 'update_slot') {
      if (!port) return NextResponse.json({ success: false, error: 'Port gereklidir' }, { status: 400 })
      const { enabled } = body
      const gwRes = await fetch(`${GATEWAY_URL}/v1/ai-engine/accounts/update-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, name, enabled }),
        signal: AbortSignal.timeout(5000),
      })
      const result = await gwRes.json()
      return NextResponse.json({ success: gwRes.ok, ...result })
    }

    return NextResponse.json({ success: false, error: 'Geçersiz aksiyon' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'İşlem başarısız' },
      { status: 500 },
    )
  }
}
