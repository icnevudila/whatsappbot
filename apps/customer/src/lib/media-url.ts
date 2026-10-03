const DIRECT_MEDIA_BASE = 'https://media.167.233.201.31.nip.io/outputs'
const GATEWAY_HOSTS = new Set(['167.233.201.31', 'media.167.233.201.31.nip.io', 'localhost', '127.0.0.1'])
const SUPABASE_STORAGE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co'

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
    if (trimmed.startsWith('/outputs/') || trimmed.startsWith('outputs/')) {
      const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
      try { return outputUrl(cleanPath) || url } catch { return url }
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

export function resolvePreviewUrl(rawSource: string | null | undefined, defaultBucket = 'brand-assets'): string | undefined {
  if (!rawSource || typeof rawSource !== 'string') return undefined
  const trimmed = rawSource.trim()
  if (!trimmed) return undefined

  // 1. Outputs path
  if (trimmed.startsWith('/outputs/') || trimmed.startsWith('outputs/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return outputUrl(cleanPath) || trimmed
  }

  // 2. Absolute HTTP/HTTPS
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return getSafeMediaUrl(trimmed) || trimmed
  }

  // 3. Local public web assets (/brand/... or /logos/...)
  if (trimmed.startsWith('/brand/') || trimmed.startsWith('/logos/') || trimmed.startsWith('brand/') || trimmed.startsWith('logos/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  // 4. Supabase Storage path (e.g. org_id/org-logo.jpg or brand-assets/... or creatives/...)
  let bucket = defaultBucket
  let filePath = trimmed.replace(/^\/+/, '')
  if (filePath.startsWith('brand-assets/')) {
    bucket = 'brand-assets'
    filePath = filePath.slice('brand-assets/'.length)
  } else if (filePath.startsWith('creatives/')) {
    bucket = 'creatives'
    filePath = filePath.slice('creatives/'.length)
  }

  const base = SUPABASE_STORAGE_URL.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${bucket}/${filePath}`
}
