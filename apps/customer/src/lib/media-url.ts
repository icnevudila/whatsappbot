export function getSafeMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (typeof url === 'string' && url.startsWith('http://167.233.201.31:3456/outputs/')) {
    const fileName = url.split('/').pop()
    return `/api/canli-takip/media-proxy?file=${encodeURIComponent(fileName || '')}`
  }
  return url
}
