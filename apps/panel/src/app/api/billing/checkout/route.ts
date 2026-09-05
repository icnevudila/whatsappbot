import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Stripe faturalama iskeleti.
 * STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET set edilince webhook dogrulanir.
 * Su an: checkout oturumu olusturma icin env yoksa 503.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
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

  let body: { priceId?: string; successUrl?: string; cancelUrl?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const priceId = body.priceId?.trim() || process.env.STRIPE_PRICE_ID?.trim()
  if (!priceId) {
    return NextResponse.json({ error: 'priceId gerekli.' }, { status: 400 })
  }

  const successUrl =
    body.successUrl?.trim() ||
    process.env.STRIPE_SUCCESS_URL?.trim() ||
    'http://localhost:3000/ayarlar?billing=ok'
  const cancelUrl =
    body.cancelUrl?.trim() ||
    process.env.STRIPE_CANCEL_URL?.trim() ||
    'http://localhost:3000/ayarlar?billing=cancel'

  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('line_items[0][price]', priceId)
  params.set('line_items[0][quantity]', '1')
  params.set('client_reference_id', user.id)
  params.set('customer_email', user.email ?? '')

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const data = (await response.json()) as { id?: string; url?: string; error?: { message?: string } }
  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? 'Stripe hata' },
      { status: 502 },
    )
  }

  return NextResponse.json({ id: data.id, url: data.url })
}
