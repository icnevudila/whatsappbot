/**
 * Spintax: {Merhaba|Selam|Hey} {{ad}} → rastgele bir alternatif.
 */
export function expandSpintax(input: string, rng: () => number = Math.random): string {
  let out = input
  let guard = 0
  while (/\{[^{}]+\}/.test(out) && guard < 20) {
    out = out.replace(/\{([^{}]+)\}/g, (_m, inner: string) => {
      const parts = inner.split('|').map((p) => p.trim()).filter(Boolean)
      if (parts.length === 0) return ''
      const idx = Math.min(parts.length - 1, Math.floor(rng() * parts.length))
      return parts[idx] ?? ''
    })
    guard += 1
  }
  return out
}

export function pickAbVariant(options: {
  bodyA: string | null
  bodyB: string | null
  abPercent: number
  targetId: string | number
}): 'a' | 'b' {
  const pct = Math.max(0, Math.min(100, options.abPercent || 0))
  if (pct <= 0 || !options.bodyB?.trim()) return 'a'
  const id = String(options.targetId)
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % 100 < pct ? 'b' : 'a'
}
