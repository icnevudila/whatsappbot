import { createHash } from 'node:crypto'

/** File identity comes exclusively from the persisted output, never guessed job aliases. */
export function persistedVideoUrl(filePath: string, gateway: string): string | null {
  const marker = '/outputs/'
  const start = filePath.indexOf(marker)
  const relative = start >= 0 ? filePath.slice(start + marker.length) : filePath
  if (!relative || relative.startsWith('/') || relative.includes('\\') || !relative.endsWith('.mp4')) return null
  const segments = relative.split('/')
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || !/^[a-zA-Z0-9_.-]+$/.test(segment))) return null
  try {
    const base = new URL(gateway)
    if (!['http:', 'https:'].includes(base.protocol)) return null
    return `${gateway.replace(/\/+$/, '')}/outputs/${segments.map(encodeURIComponent).join('/')}`
  } catch { return null }
}

/** Validate complete bytes before serving any range, including private review playback. */
export function verifiedVideoResponse(bytes: Uint8Array, evidence: { sha256: unknown; byte_size: unknown }, range?: string | null): Response {
  const size = Number(evidence.byte_size)
  if (typeof evidence.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(evidence.sha256) ||
      !Number.isSafeInteger(size) || size <= 0 || size !== bytes.byteLength ||
      createHash('sha256').update(bytes).digest('hex') !== evidence.sha256.toLowerCase()) {
    return new Response('Video bütünlüğü doğrulanamadı. Kayıtlı çıktı ile sunulan dosya farklı.', { status: 502 })
  }
  const headers = new Headers({ 'Content-Type': 'video/mp4', 'Cache-Control': 'private, no-store',
    'Accept-Ranges': 'bytes', ETag: `"${evidence.sha256.toLowerCase()}"` })
  if (!range) {
    headers.set('Content-Length', String(size))
    return new Response(bytes as BodyInit, { headers })
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range)
  let start = match?.[1] ? Number(match[1]) : 0
  let end = match?.[2] ? Number(match[2]) : size - 1
  if (match && !match[1] && match[2]) { start = Math.max(0, size - Number(match[2])); end = size - 1 }
  if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size || end < 0) {
    headers.set('Content-Range', `bytes */${size}`)
    return new Response(null, { status: 416, headers })
  }
  end = Math.min(end, size - 1)
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
  headers.set('Content-Length', String(end - start + 1))
  return new Response(bytes.slice(start, end + 1) as BodyInit, { status: 206, headers })
}
