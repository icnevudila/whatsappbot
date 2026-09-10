/** URL `sayfa` parametresi ve sayfa aralığı yardımcıları. */

export const PAGE_SIZES = {
  campaigns: 20,
  lists: 20,
  members: 50,
  blacklist: 40,
} as const

export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

export function totalPages(totalItems: number, pageSize: number): number {
  if (totalItems <= 0) return 1
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function clampPage(page: number, pages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, pages))
}

/** Supabase `.range` için (dahil). */
export function rangeForPage(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

/**
 * Gösterilecek sayfa numaraları. Örn. 1 … 4 5 6 … 12
 * Ara boşluklar için `null` döner.
 */
export function pageItems(current: number, pages: number, sibling = 1): (number | null)[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1)
  }

  const set = new Set<number>()
  set.add(1)
  set.add(pages)
  for (let p = current - sibling; p <= current + sibling; p += 1) {
    if (p >= 1 && p <= pages) set.add(p)
  }

  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | null)[] = []
  for (let i = 0; i < sorted.length; i += 1) {
    const n = sorted[i]!
    if (i > 0 && n - sorted[i - 1]! > 1) out.push(null)
    out.push(n)
  }
  return out
}

export function buildPageHref(
  pathname: string,
  page: number,
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams()
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value)
    }
  }
  if (page > 1) params.set('sayfa', String(page))
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
