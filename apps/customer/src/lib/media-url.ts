export function getSafeMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (typeof url === 'string') {
    const trimmed = url.trim()
    if (trimmed.startsWith('/outputs/')) {
      const fileName = trimmed.split('/').pop()
      if (fileName) return `/api/canli-takip/media-proxy?file=${encodeURIComponent(fileName)}`
    }
    try {
      const parsed = new URL(trimmed)
      if (parsed.pathname.startsWith('/outputs/')) {
        const fileName = parsed.pathname.split('/').pop()
        if (fileName) return `/api/canli-takip/media-proxy?file=${encodeURIComponent(fileName)}`
      }
    } catch {
      // Storage URL'leri ve uygulama içi göreli yollar doğrudan kullanılabilir.
    }
  }
  return url
}
