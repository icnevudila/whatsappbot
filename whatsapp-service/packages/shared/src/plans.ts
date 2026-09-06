/** Plan kimlikleri — Stripe webhook, Ayarlar, landing ve admin aynı sözlük. */
export const PLAN_IDS = ['free', 'starter', 'pro', 'enterprise'] as const
export type PlanId = (typeof PLAN_IDS)[number]

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Deneme',
  starter: 'Başlangıç',
  pro: 'Büyüme',
  enterprise: 'Ajans',
}

/** Aylık kota özeti (organizations tablosu / Stripe metadata ile uyumlu). */
export const PLAN_QUOTAS: Record<
  PlanId,
  { accounts: number; messages: number }
> = {
  free: { accounts: 1, messages: 1_000 },
  starter: { accounts: 3, messages: 10_000 },
  pro: { accounts: 10, messages: 50_000 },
  enterprise: { accounts: 50, messages: 500_000 },
}

export function planLabel(plan: string | null | undefined): string {
  if (!plan) return PLAN_LABELS.free
  const key = plan.toLowerCase() as PlanId
  return PLAN_LABELS[key] ?? plan
}

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value)
}
