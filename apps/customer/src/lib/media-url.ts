const DIRECT_MEDIA_BASE = 'https://media.167.233.201.31.nip.io/outputs'
const GATEWAY_HOSTS = new Set(['167.233.201.31', 'media.167.233.201.31.nip.io', 'localhost', '127.0.0.1'])

function outputUrl(pathname: string): string | undefined {
  if (!/^\/outputs\/[^/]+$/.test(pathname)) return undefined
  const filename = decodeURIComponent(pathname.slice('/outputs/'.length))
  if (!filename || filename.includes('/') || filename.includes('\\')) return undefined
  return `${DIRECT_MEDIA_BASE}/${encodeURIComponent(filename)}`
}

export function getSafeMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (typeof url === 'string') {
    const trimmed = url.trim()
    if (trimmed.startsWith('/outputs/')) {
      try { return outputUrl(trimmed) || url } catch { return url }
    }
    try {
      const parsed = new URL(trimmed)
      if (GATEWAY_HOSTS.has(parsed.hostname) && ['http:', 'https:'].includes(parsed.protocol)) {
        return outputUrl(parsed.pathname) || url
      }
    } catch {
      // Storage URL'leri ve uygulama içi göreli yollar doğrudan kullanılabilir.
    }
  }
  return url
}
