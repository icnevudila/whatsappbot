import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'

/**
 * Faturalama yapılandırma durumu — Ayarlar UI’si tıklamadan göstersin.
 * Secret değerleri asla dönmez.
 */
export async function GET() {
  try {
    await requireActiveOrg()
  } catch {
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
  }

  const stripeSecret = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  const stripePrice = Boolean(process.env.STRIPE_PRICE_ID?.trim())
  const stripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim())
  const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  const siteUrl = Boolean(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.VERCEL_URL?.trim(),
  )

  const checkoutReady = stripeSecret && stripePrice
  const webhookReady = checkoutReady && stripeWebhook && serviceRole
  const inviteReady = serviceRole

  return NextResponse.json({
    checkoutReady,
    webhookReady,
    inviteReady,
    missing: [
      !stripeSecret ? 'STRIPE_SECRET_KEY' : null,
      !stripePrice ? 'STRIPE_PRICE_ID' : null,
      !stripeWebhook ? 'STRIPE_WEBHOOK_SECRET' : null,
      !serviceRole ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
      !siteUrl ? 'NEXT_PUBLIC_SITE_URL' : null,
    ].filter(Boolean),
  })
}
