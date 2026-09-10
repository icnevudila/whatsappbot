import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { PLAN_QUOTAS, isPlanId, type PlanId } from '@wa/shared'
import { planFromStripePriceId } from '@/lib/stripe-prices'

export const runtime = 'nodejs'

type StripeObject = {
  id?: string
  object?: string
  client_reference_id?: string
  customer?: string | { id?: string }
  subscription?: string | { id?: string }
  status?: string
  metadata?: Record<string, string>
  items?: {
    data?: Array<{ price?: { id?: string } }>
  }
}

type StripeEvent = {
  id?: string
  type?: string
  data?: { object?: StripeObject }
}

function customerId(obj: StripeObject | undefined): string | null {
  if (!obj?.customer) return null
  return typeof obj.customer === 'string' ? obj.customer : obj.customer.id ?? null
}

function subscriptionId(obj: StripeObject | undefined): string | null {
  if (!obj) return null
  if (obj.object === 'subscription' && obj.id) return obj.id
  if (typeof obj.subscription === 'string') return obj.subscription
  if (obj.subscription && typeof obj.subscription === 'object') {
    return obj.subscription.id ?? null
  }
  return null
}

function resolvePlan(obj: StripeObject | undefined): PlanId {
  const meta = obj?.metadata
  const raw = (meta?.filo_plan || meta?.plan || '').toLowerCase()
  if (isPlanId(raw)) return raw
  const priceId = obj?.items?.data?.[0]?.price?.id
  return planFromStripePriceId(priceId)
}

async function resolveOrgId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  obj: StripeObject | undefined,
): Promise<string | null> {
  const fromMeta =
    obj?.metadata?.org_id ||
    obj?.client_reference_id ||
    null
  if (fromMeta) return fromMeta

  const cust = customerId(obj)
  if (!cust) return null

  const { data } = await admin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', cust)
    .maybeSingle()
  return (data as { id?: string } | null)?.id ?? null
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'service role env eksik' }, { status: 503 })
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const obj = event.data?.object
  const type = event.type ?? ''

  const downgrade =
    type === 'customer.subscription.deleted' ||
    (type === 'customer.subscription.updated' &&
      (obj?.status === 'past_due' ||
        obj?.status === 'unpaid' ||
        obj?.status === 'canceled' ||
        obj?.status === 'incomplete_expired'))

  const upgrade =
    type === 'checkout.session.completed' ||
    (type === 'customer.subscription.updated' &&
      (obj?.status === 'active' || obj?.status === 'trialing'))

  if (!downgrade && !upgrade) {
    return NextResponse.json({ received: true, skipped: type })
  }

  const orgId = await resolveOrgId(admin, obj)
  if (!orgId) {
    console.warn('[stripe-webhook] org_id yok', event.id, type)
    return NextResponse.json({ received: true, skipped: 'no_org' })
  }

  const planKey: PlanId = downgrade ? 'free' : resolvePlan(obj)
  const quotas = PLAN_QUOTAS[planKey]

  const { error } = await admin.rpc('apply_stripe_subscription', {
    p_org_id: orgId,
    p_plan: planKey,
    p_accounts_quota: quotas.accounts,
    p_monthly_message_quota: quotas.messages,
    p_stripe_customer_id: customerId(obj),
    p_stripe_subscription_id: downgrade ? null : subscriptionId(obj),
  })

  if (error) {
    console.error('[stripe-webhook] apply failed', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Ödeme gecikmesi / unpaid → askı (gönderim + claim kesilir).
  // İptal / silme → free kota, askıyı kaldır (bilinçli iptal).
  // Active/trialing → askıyı temizle.
  const status = obj?.status ?? ''
  if (upgrade) {
    await admin
      .from('organizations')
      .update({ suspended_at: null, suspend_reason: null })
      .eq('id', orgId)
  } else if (status === 'past_due' || status === 'unpaid') {
    await admin
      .from('organizations')
      .update({
        suspended_at: new Date().toISOString(),
        suspend_reason: 'stripe_past_due',
      })
      .eq('id', orgId)
  } else if (
    type === 'customer.subscription.deleted' ||
    status === 'canceled' ||
    status === 'incomplete_expired'
  ) {
    await admin
      .from('organizations')
      .update({ suspended_at: null, suspend_reason: null })
      .eq('id', orgId)
  }

  return NextResponse.json({ received: true, plan: planKey, orgId, status })
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
