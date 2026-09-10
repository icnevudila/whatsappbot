import type { PlanId } from '@wa/shared'
import { isPlanId } from '@wa/shared'

/** Plan → Stripe Price ID (env). STRIPE_PRICE_ID starter fallback. */
export function stripePriceIdForPlan(plan: PlanId): string | null {
  const map: Record<Exclude<PlanId, 'free'>, string | undefined> = {
    starter:
      process.env.STRIPE_PRICE_STARTER?.trim() || process.env.STRIPE_PRICE_ID?.trim(),
    pro: process.env.STRIPE_PRICE_PRO?.trim(),
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE?.trim(),
  }
  if (plan === 'free') return null
  return map[plan] || null
}

export function planFromStripePriceId(priceId: string | undefined | null): PlanId {
  if (!priceId) return 'starter'
  const pairs: [string | undefined, PlanId][] = [
    [process.env.STRIPE_PRICE_STARTER?.trim() || process.env.STRIPE_PRICE_ID?.trim(), 'starter'],
    [process.env.STRIPE_PRICE_PRO?.trim(), 'pro'],
    [process.env.STRIPE_PRICE_ENTERPRISE?.trim(), 'enterprise'],
  ]
  for (const [id, plan] of pairs) {
    if (id && id === priceId) return plan
  }
  return 'starter'
}

export function resolveCheckoutPlan(raw: string | undefined): Exclude<PlanId, 'free'> {
  const key = (raw ?? 'starter').toLowerCase()
  if (isPlanId(key) && key !== 'free') return key
  return 'starter'
}
