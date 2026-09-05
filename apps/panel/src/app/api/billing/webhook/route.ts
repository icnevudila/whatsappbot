import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

/**
 * Stripe webhook iskeleti — imza dogrulama + event log.
 * Abonelik -> org.plan guncelleme sonradan baglanir.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET yok' }, { status: 503 })
  }

  const payload = await request.text()
  const sigHeader = request.headers.get('stripe-signature') ?? ''
  if (!verifyStripeSignature(payload, sigHeader, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  let event: { type?: string; id?: string }
  try {
    event = JSON.parse(payload) as { type?: string; id?: string }
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // TODO: checkout.session.completed → organizations.plan / kota
  console.info('[stripe-webhook]', event.type, event.id)

  return NextResponse.json({ received: true })
}

function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): boolean {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k, v]
    }),
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) return false

  const signed = `${timestamp}.${payload}`
  const expected = createHmac('sha256', secret).update(signed, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}
