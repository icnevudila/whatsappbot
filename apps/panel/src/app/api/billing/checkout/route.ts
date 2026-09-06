import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { resolveCheckoutPlan, stripePriceIdForPlan } from '@/lib/stripe-prices'

export const runtime = 'nodejs'

/**
 * Stripe Checkout — metadata.org_id + filo_plan ile webhook org gunceller.
 * Price: STRIPE_PRICE_{STARTER|PRO|ENTERPRISE} veya STRIPE_PRICE_ID (starter).
 */
export async function POST(request: Request) {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ userId, org } = await requireActiveOrg())
  } catch {
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
  }

  if (org.role !== 'owner' && org.role !== 'admin') {
    return NextResponse.json({ error: 'Yalnızca admin yükseltebilir.' }, { status: 403 })
  }

  if (org.suspended_at) {
    return NextResponse.json({ error: 'İşletme askıda; faturalama kapalı.' }, { status: 403 })
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) {
    return NextResponse.json(
      {
        error: 'Faturalama henüz yapılandırılmadı (STRIPE_SECRET_KEY).',
        status: 'not_configured',
      },
      { status: 503 },
    )
  }

  let body: {
    priceId?: string
    plan?: string
    successUrl?: string
    cancelUrl?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const plan = resolveCheckoutPlan(body.plan)
  // İstemci priceId göndermesin — plan→env price eşlemesi zorunlu (ücret/plan uyumsuzluğu engeli).
  const priceId = stripePriceIdForPlan(plan)
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Faturalama henüz yapılandırılmadı (STRIPE_PRICE_${plan.toUpperCase()} / STRIPE_PRICE_ID).`,
        status: 'not_configured',
      },
      { status: 503 },
    )
  }

  const siteOrigin = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    new URL(request.url).origin
  ).replace(/\/$/, '')
  const successUrl =
    body.successUrl?.trim() ||
    process.env.STRIPE_SUCCESS_URL?.trim() ||
    `${siteOrigin}/ayarlar?billing=ok`
  const cancelUrl =
    body.cancelUrl?.trim() ||
    process.env.STRIPE_CANCEL_URL?.trim() ||
    `${siteOrigin}/ayarlar?billing=cancel`

  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('line_items[0][price]', priceId)
  params.set('line_items[0][quantity]', '1')
  params.set('client_reference_id', org.id)
  params.set('metadata[org_id]', org.id)
  params.set('metadata[filo_plan]', plan)
  params.set('metadata[user_id]', userId)
  params.set('subscription_data[metadata][org_id]', org.id)
  params.set('subscription_data[metadata][filo_plan]', plan)

  if (org.stripe_customer_id) {
    params.set('customer', org.stripe_customer_id)
  } else {
    const { data: userData } = await (
      await import('@/lib/supabase/server')
    ).createSupabaseServerClient().then((s) => s.auth.getUser())
    if (userData.user?.email) {
      params.set('customer_email', userData.user.email)
    }
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const data = (await response.json()) as {
    id?: string
    url?: string
    error?: { message?: string }
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? 'Stripe hata' },
      { status: 502 },
    )
  }

  return NextResponse.json({ id: data.id, url: data.url })
}
