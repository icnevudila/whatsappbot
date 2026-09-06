/** Product pacing policy, not a guaranteed WhatsApp platform allowance. */
export function warmupCap(startedAt: string | null, now = Date.now()): number {
  const started = startedAt ? Date.parse(startedAt) : NaN
  if (!Number.isFinite(started)) return 10
  const days = Math.floor((now - started) / 86_400_000)
  if (days < 1) return 10
  if (days < 3) return 25
  if (days < 7) return 60
  if (days < 14) return 120
  return 250
}
