import { NextResponse } from 'next/server'
import { isPlanId } from '@wa/shared'
import { requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'

/**
 * Stripe Checkout — metadata.org_id + filo_plan ile webhook org gunceller.
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

  const priceId = body.priceId?.trim() || process.env.STRIPE_PRICE_ID?.trim()
  if (!priceId) {
    return NextResponse.json(
      {
        error: 'Faturalama henüz yapılandırılmadı (STRIPE_PRICE_ID).',
        status: 'not_configured',
      },
      { status: 503 },
    )
  }

  const rawPlan = (body.plan?.trim() || 'starter').toLowerCase()
  const plan = isPlanId(rawPlan) && rawPlan !== 'free' ? rawPlan : 'starter'
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

  const { data: userData } = await (
    await import('@/lib/supabase/server')
  ).createSupabaseServerClient().then((s) => s.auth.getUser())
  if (userData.user?.email) {
    params.set('customer_email', userData.user.email)
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
