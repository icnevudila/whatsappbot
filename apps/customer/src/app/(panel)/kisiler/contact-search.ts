/** Defter araması: ad + telefon, PostgREST `.or()` filtresi. */

export function sanitizeContactSearch(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 80)
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function quoteOrValue(value: string): string {
  return `"${value.replace(/"/g, '')}"`
}

/** E.164 içinden parça eşlemek için basamak iğnesi. */
export function phoneSearchNeedle(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 3) return null
  if (digits.startsWith('90') && digits.length >= 5) return digits.slice(2)
  if (digits.startsWith('0') && digits.length >= 4) return digits.slice(1)
  return digits
}

export function contactSearchOrFilter(raw: string): string | null {
  const q = sanitizeContactSearch(raw)
  if (!q) return null

  const pattern = `%${escapeIlike(q)}%`
  const parts = [
    `name.ilike.${quoteOrValue(pattern)}`,
    `phone_e164.ilike.${quoteOrValue(pattern)}`,
  ]

  const needle = phoneSearchNeedle(q)
  if (needle && needle !== q) {
    parts.push(`phone_e164.ilike.${quoteOrValue(`%${escapeIlike(needle)}%`)}`)
  }

  return parts.join(',')
}
