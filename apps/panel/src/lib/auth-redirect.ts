/** Redirects are restricted to canonical, same-origin application paths. */
export function safeInternalPath(value: string | null | undefined, fallback = '/ozet'): string {
  if (!value || !value.startsWith('/') || /[\\\s\u0000-\u001f]/.test(value)) return fallback
  try {
    const base = 'https://filo.invalid'
    const url = new URL(value, base)
    if (url.origin !== base || /%2f|%5c/i.test(url.pathname)) return fallback
    if (url.pathname === '/giris' || url.pathname.startsWith('/auth/')) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
