/**
 * Basit bellek ici rate limit (tek instance). Vercel'de edge tutarsiz olabilir;
 * amac AI route spam'ini kesmek.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const cur = buckets.get(key)
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true }
  }
  if (cur.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) }
  }
  cur.count += 1
  return { ok: true }
}
