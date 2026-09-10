/**
 * Stripe aboneliğini hemen iptal eder (best-effort).
 * Org silmeden önce çağrılır; hata org silmeyi engellemez — loglanır.
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) return { ok: false, error: 'STRIPE_SECRET_KEY yok' }

  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    },
  )

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return { ok: false, error: body.slice(0, 200) || `HTTP ${response.status}` }
  }
  return { ok: true }
}
