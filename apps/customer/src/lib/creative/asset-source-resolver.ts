import type { SupabaseClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

export type ResolvedAsset = {
  data: Buffer
  mimeType: string
  sourceType: 'absolute_url' | 'gateway_output' | 'public_brand' | 'public_logo' | 'storage' | 'filesystem'
  resolvedUrl: string
  sha256: string
  width?: number
  height?: number
  decode?: 'success'
}

function detectMime(filePathOrExt: string): string {
  const ext = (filePathOrExt.split('.').pop() || '').toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'svg') return 'image/svg+xml'
  return 'image/png'
}

function defaultGatewayUrl(): string {
  return (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')
}

const MAX_ASSET_BYTES = 20 * 1024 * 1024
async function boundedImageBytes(response: Response): Promise<Buffer> {
  if (Number(response.headers.get('content-length') || 0) > MAX_ASSET_BYTES || !response.body) throw new Error('ASSET_TOO_LARGE')
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_ASSET_BYTES) throw new Error('ASSET_TOO_LARGE')
      chunks.push(Buffer.from(value))
    }
    return Buffer.concat(chunks, size)
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}

function allowedFilesystemAsset(source: string): boolean {
  const roots = (process.env.MEDIA_ASSET_FILESYSTEM_ROOTS || '').split(path.delimiter).filter(Boolean)
  if (!roots.length) return false // Explicit operator configuration; never read arbitrary user paths.
  try {
    const target = fs.realpathSync(/* turbopackIgnore: true */ source)
    return roots.some(root => {
      const relative = path.relative(fs.realpathSync(/* turbopackIgnore: true */ root), target)
      return relative !== '' && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)
    })
  } catch { return false }
}

/**
 * Tek ve kanonik Asset Source Resolver.
 * /brand, /outputs, /logos, absolute URL, filesystem ve Supabase Storage kaynaklarını
 * doğru taban ve protokol üzerinden çözümler. Kör host prefixleme yapmaz.
 */
export async function resolveAssetSource(
  rawSource: string | null | undefined,
  options?: { tenantId?: string; supabase?: SupabaseClient | null },
): Promise<ResolvedAsset | null> {
  const asset = await resolveRawAssetSource(rawSource, options)
  if (!asset || asset.data.length > 20 * 1024 * 1024) return null
  try {
    // MIME headers and file extensions cannot establish image validity.
    const image = sharp(asset.data, { limitInputPixels: 40_000_000, failOn: 'warning' })
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height || metadata.width < 1 || metadata.height < 1) return null
    const mimeTypes: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml' }
    const mime = mimeTypes[metadata.format || '']
    if (!mime) return null
    await image.raw().toBuffer() // Force pixel decode; metadata alone accepts truncated files.
    return { ...asset, mimeType: mime, width: metadata.width, height: metadata.height, decode: 'success' }
  } catch { return null }
}

async function resolveRawAssetSource(
  rawSource: string | null | undefined,
  options?: {
    tenantId?: string
    supabase?: SupabaseClient | null
  },
): Promise<ResolvedAsset | null> {
  if (!rawSource || typeof rawSource !== 'string') return null
  const source = rawSource.trim()
  if (!source) return null
  if (/^\/?(?:brand|logos|outputs)\//.test(source)) {
    try {
      if (decodeURIComponent(source).split(/[\\/]/).some(part => part === '..' || part === '.') || source.includes('\u0000')) return null
    } catch { return null }
  }
  if (options?.tenantId) {
    // Storage object keys are tenant-namespaced. Reject foreign UUID namespaces before I/O.
    const storageKey = /^https?:/.test(source) ? (() => {
      try { return decodeURIComponent(new URL(source).pathname).match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.*)/)?.[1] || '' }
      catch { return '' }
    })() : source.replace(/^\/?(?:brand-assets|creatives)\//, '')
    const owner = storageKey.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\//i)?.[1]
    if (owner && owner.toLowerCase() !== options.tenantId.toLowerCase()) throw new Error('CROSS_ORG_CONTAMINATION')
  }

  const gw = defaultGatewayUrl()

  // 1. media-proxy query parametresi içeren URL'ler
  if (source.includes('media-proxy?file=')) {
    const fileName = source.split('media-proxy?file=')[1]?.split('&')[0]
    if (fileName) {
      const directUrl = `${gw}/outputs/${decodeURIComponent(fileName)}`
      return resolveAssetSource(directUrl, options)
    }
  }

  // 2. Tam (Absolute) HTTP / HTTPS URL'leri
  if (source.startsWith('http://') || source.startsWith('https://')) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) return null
      const mime = (response.headers.get('content-type') || '').split(';')[0].trim() || detectMime(source)
      if (!mime.startsWith('image/')) return null
      const data = await boundedImageBytes(response)
      if (data.length < 32) return null
      const sha256 = createHash('sha256').update(data).digest('hex')
      return {
        data,
        mimeType: mime,
        sourceType: source.includes('/outputs/') ? 'gateway_output' : 'absolute_url',
        resolvedUrl: source,
        sha256,
      }
    } catch {
      return null
    }
  }

  // 3. /outputs/... veya outputs/... (OmniStudio Gateway çıktıları)
  if (source.startsWith('/outputs/') || source.startsWith('outputs/')) {
    const cleanOutput = source.replace(/^\/+/, '')
    const fileName = path.basename(cleanOutput)

    // Yerel dosya sistemi kontrolü (Gateway container içinde veya volume üzerinde)
    const diskCandidates = [
      path.resolve('/app/gateway/outputs', fileName),
      path.resolve(process.cwd(), 'outputs', fileName),
      path.resolve(process.cwd(), '../services/omnistudio/gateway/outputs', fileName),
      path.resolve('/var/lib/docker/volumes/infra_flow-outputs/_data', fileName),
    ]

    for (const diskPath of diskCandidates) {
      try {
        if (fs.existsSync(/* turbopackIgnore: true */ diskPath) && fs.statSync(/* turbopackIgnore: true */ diskPath).size >= 32 && fs.statSync(/* turbopackIgnore: true */ diskPath).size <= MAX_ASSET_BYTES) {
          const data = fs.readFileSync(/* turbopackIgnore: true */ diskPath)
          const sha256 = createHash('sha256').update(data).digest('hex')
          return {
            data,
            mimeType: detectMime(diskPath),
            sourceType: 'gateway_output',
            resolvedUrl: `${gw}/${cleanOutput}`,
            sha256,
          }
        }
      } catch {
        /* skip */
      }
    }

    // Gateway HTTP üzerinden indir
    try {
      const gwUrl = `${gw}/${cleanOutput}`
      const response = await fetch(gwUrl, { signal: AbortSignal.timeout(15000) })
      if (response.ok) {
        const mime = (response.headers.get('content-type') || '').split(';')[0].trim() || detectMime(cleanOutput)
        if (mime.startsWith('image/')) {
          const data = await boundedImageBytes(response)
          if (data.length >= 32) {
            const sha256 = createHash('sha256').update(data).digest('hex')
            return {
              data,
              mimeType: mime,
              sourceType: 'gateway_output',
              resolvedUrl: gwUrl,
              sha256,
            }
          }
        }
      }
    } catch {
      /* continue */
    }
  }

  // 4. /brand/... veya /logos/... (Uygulama statik varlıkları)
  if (source.startsWith('/brand/') || source.startsWith('/logos/') || source.startsWith('brand/') || source.startsWith('logos/')) {
    const cleanPath = source.replace(/^\/+/, '')
    const baseName = path.basename(cleanPath)

    // Yerel disk kontrolleri (apps/customer, apps/landing, /opt/whatsappbot)
    const localCandidates = [
      path.resolve(process.cwd(), 'public', cleanPath),
      path.resolve(process.cwd(), 'apps/customer/public', cleanPath),
      path.resolve(process.cwd(), 'apps/landing/public', cleanPath),
      path.resolve(__dirname, '../../../../customer/public', cleanPath),
      path.resolve(__dirname, '../../../../landing/public', cleanPath),
      path.resolve('/opt/whatsappbot/apps/customer/public', cleanPath),
      path.resolve('/opt/whatsappbot/apps/landing/public', cleanPath),
    ]

    for (const cand of localCandidates) {
      try {
        if (fs.existsSync(/* turbopackIgnore: true */ cand) && fs.statSync(/* turbopackIgnore: true */ cand).size >= 32 && fs.statSync(/* turbopackIgnore: true */ cand).size <= MAX_ASSET_BYTES) {
          const data = fs.readFileSync(/* turbopackIgnore: true */ cand)
          const sha256 = createHash('sha256').update(data).digest('hex')
          return {
            data,
            mimeType: detectMime(cand),
            sourceType: cleanPath.startsWith('brand/') ? 'public_brand' : 'public_logo',
            resolvedUrl: `/${cleanPath}`,
            sha256,
          }
        }
      } catch {
        /* skip */
      }
    }

    // Web domain fallback (app.mesajify.com veya mesajify.com)
    const webBases = [
      process.env.NEXT_PUBLIC_APP_URL || 'https://app.mesajify.com',
      process.env.NEXT_PUBLIC_LANDING_URL || 'https://mesajify.com',
    ]

    for (const webBase of webBases) {
      try {
        const fullUrl = `${webBase.replace(/\/$/, '')}/${cleanPath}`
        const response = await fetch(fullUrl, { signal: AbortSignal.timeout(10000) })
        if (response.ok) {
          const mime = (response.headers.get('content-type') || '').split(';')[0].trim() || detectMime(cleanPath)
          if (mime.startsWith('image/')) {
            const data = await boundedImageBytes(response)
            if (data.length >= 32) {
              const sha256 = createHash('sha256').update(data).digest('hex')
              return {
                data,
                mimeType: mime,
                sourceType: cleanPath.startsWith('brand/') ? 'public_brand' : 'public_logo',
                resolvedUrl: fullUrl,
                sha256,
              }
            }
          }
        }
      } catch {
        /* skip */
      }
    }
  }

  // 5. Yerel dosya sistemi mutlak yolu (/tmp/..., C:\..., /app/...)
  if (path.isAbsolute(source) && allowedFilesystemAsset(source)) {
    try {
      if (fs.existsSync(/* turbopackIgnore: true */ source) && fs.statSync(/* turbopackIgnore: true */ source).size >= 32 && fs.statSync(/* turbopackIgnore: true */ source).size <= MAX_ASSET_BYTES) {
        const data = fs.readFileSync(/* turbopackIgnore: true */ source)
        const sha256 = createHash('sha256').update(data).digest('hex')
        return {
          data,
          mimeType: detectMime(source),
          sourceType: 'filesystem',
          resolvedUrl: source,
          sha256,
        }
      }
    } catch {
      /* continue */
    }
  }

  // 6. Supabase Storage yolu (örn: 2881f690-.../org-logo.jpg veya brand-assets/...)
  if (options?.supabase) {
    const supabase = options.supabase
    let bucket = 'brand-assets'
    let filePath = source.replace(/^\/+/, '')

    if (filePath.startsWith('brand-assets/')) {
      bucket = 'brand-assets'
      filePath = filePath.slice('brand-assets/'.length)
    } else if (filePath.startsWith('creatives/')) {
      bucket = 'creatives'
      filePath = filePath.slice('creatives/'.length)
    }

    const tryBuckets = [bucket, bucket === 'brand-assets' ? 'creatives' : 'brand-assets']

    for (const b of tryBuckets) {
      try {
        const { data: blob, error } = await supabase.storage.from(b).download(filePath)
        if (!error && blob) {
          if (blob.size > MAX_ASSET_BYTES) return null
          const arrayBuf = await blob.arrayBuffer()
          const data = Buffer.from(arrayBuf)
          if (data.length >= 32) {
            const sha256 = createHash('sha256').update(data).digest('hex')
            const pub = supabase.storage.from(b).getPublicUrl(filePath).data.publicUrl
            return {
              data,
              mimeType: detectMime(filePath),
              sourceType: 'storage',
              resolvedUrl: pub || filePath,
              sha256,
            }
          }
        }
      } catch {
        /* skip */
      }
    }
  }

  return null
}
