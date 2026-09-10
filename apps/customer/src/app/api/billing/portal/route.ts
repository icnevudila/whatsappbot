import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'

/** Stripe Customer Portal — kart / iptal. */
export async function POST(request: Request) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ org } = await requireActiveOrg())
  } catch {
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
  }

  if (org.role !== 'owner' && org.role !== 'admin') {
    return NextResponse.json({ error: 'Yalnızca admin.' }, { status: 403 })
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'not_configured', status: 'not_configured' }, { status: 503 })
  }

  if (!org.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Henüz Stripe müşteri kaydı yok. Önce paket yükseltin.' },
      { status: 400 },
    )
  }

  const siteOrigin = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    new URL(request.url).origin
  ).replace(/\/$/, '')

  const params = new URLSearchParams()
  params.set('customer', org.stripe_customer_id)
  params.set('return_url', `${siteOrigin}/ayarlar`)

  const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const data = (await response.json()) as {
    url?: string
    error?: { message?: string }
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? 'Stripe portal hata' },
      { status: 502 },
    )
  }

  return NextResponse.json({ url: data.url })
}
