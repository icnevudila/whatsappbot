import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

type StripeEvent = {
  id?: string
  type?: string
  data?: {
    object?: {
      id?: string
      client_reference_id?: string
      customer?: string
      subscription?: string
      metadata?: Record<string, string>
      metadata_org_id?: string
    }
  }
}

const PLAN_QUOTAS: Record<
  string,
  { plan: 'free' | 'starter' | 'pro' | 'enterprise'; accounts: number; messages: number }
> = {
  free: { plan: 'free', accounts: 1, messages: 1000 },
  starter: { plan: 'starter', accounts: 3, messages: 10_000 },
  pro: { plan: 'pro', accounts: 10, messages: 50_000 },
  enterprise: { plan: 'enterprise', accounts: 50, messages: 500_000 },
}

function resolvePlan(meta: Record<string, string> | undefined): keyof typeof PLAN_QUOTAS {
  const raw = (meta?.filo_plan || meta?.plan || 'starter').toLowerCase()
  return raw in PLAN_QUOTAS ? (raw as keyof typeof PLAN_QUOTAS) : 'starter'
}

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

  let event: StripeEvent
  try {
    event = JSON.parse(payload) as StripeEvent
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'customer.subscription.updated'
  ) {
    const obj = event.data?.object
    const orgId =
      obj?.metadata?.org_id ||
      obj?.client_reference_id ||
      process.env.STRIPE_DEFAULT_ORG_ID?.trim()
    if (!orgId) {
      console.warn('[stripe-webhook] org_id yok', event.id)
      return NextResponse.json({ received: true, skipped: 'no_org' })
    }

    const planKey = resolvePlan(obj?.metadata)
    const quotas = PLAN_QUOTAS[planKey]
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'service role env eksik' }, { status: 503 })
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error } = await admin.rpc('apply_stripe_subscription', {
      p_org_id: orgId,
      p_plan: quotas.plan,
      p_accounts_quota: quotas.accounts,
      p_monthly_message_quota: quotas.messages,
      p_stripe_customer_id: obj?.customer ?? null,
      p_stripe_subscription_id:
        typeof obj?.subscription === 'string' ? obj.subscription : obj?.id ?? null,
    })

    if (error) {
      console.error('[stripe-webhook] apply failed', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

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
