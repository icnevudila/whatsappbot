import { createHash, createHmac } from 'node:crypto'
import { mkdtemp, open, unlink, rmdir } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { isApprovedFinalVideoOutput } from './video-output-approval'
import { libraryVideoOutputId } from './video-library-state'
import { persistedVideoUrl } from './video-delivery'
import { isImageReviewApproved } from './image-review'

export type DownloadCreative = {
  id: string; org_id: string; title: string | null; format: string; status: string;
  storage_path: string | null; public_url: string | null; payload: unknown
}
export type DownloadOutput = {
  id: string; org_id: string; file_path: string; storage_url: string | null;
  sha256: string; byte_size: number; verified: boolean; is_approved: boolean;
  duration_seconds: number; width: number; height: number; product_type?: string | null; visual_qa_report?: unknown
}
export type DownloadDependencies = {
  orgId: string;
  creative: (id: string) => Promise<DownloadCreative | null>;
  output: (id: string) => Promise<DownloadOutput | null>;
  signStorage: (key: string) => Promise<string | null>;
  storageOrigin: string; gatewayOrigin: string; mediaSigningSecret: string;
  fetch: typeof fetch;
}

const TYPES: Record<string, string> = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4'}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const SHA = /^[a-f0-9]{64}$/i
const PRIVATE_HEADERS = {'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer'}

class DownloadError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function validStorageKey(key: string, orgId: string): boolean {
  return key.startsWith(`${orgId}/`) && !key.includes('\\') && !/[\u0000-\u001f%?#]/.test(key) &&
    key.split('/').every(part => part && part !== '.' && part !== '..')
}

/** Same HMAC contract as Gateway public_output_access.js; only server-owned identity is signed. */
export function signedGatewayDownload(filePath: string, orgId: string, origin: string, secret: string, now = Date.now()): string {
  if (!secret.trim()) throw new DownloadError(503, 'Güvenli medya bağlantısı yapılandırılmamış.')
  const canonical = persistedVideoUrl(filePath, origin)
  if (!canonical) throw new DownloadError(422, 'Kayıtlı final video yolu geçersiz.')
  const url = new URL(canonical)
  // The current Gateway ownership/signature contract supports a single basename.
  if (!/^\/outputs\/[a-zA-Z0-9_.-]+\.mp4$/.test(url.pathname) || /(?:^|[_.-])raw(?:[_.-]|$)/i.test(url.pathname.split('/').pop() || '')) {
    throw new DownloadError(422, 'Onaylanmış final video dosyası bulunamadı.')
  }
  const filename = decodeURIComponent(url.pathname.slice('/outputs/'.length))
  const expiry = Math.floor(now / 1000) + 120
  url.search = new URLSearchParams({tid:orgId,exp:String(expiry),sig:createHmac('sha256',secret.trim()).update(`${filename}:${orgId}:${expiry}`).digest('hex')}).toString()
  return url.toString()
}

export function downloadFilename(title: string | null, id: string, extension: string): string {
  const sanitized = (title || 'Mesajify reklam').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g,' ')
    .replace(/\s+/g,' ').trim().replace(/[. ]+$/,'')
  const name = Array.from(sanitized).slice(0,80).join('') || 'Mesajify reklam'
  return `${name}-${id.slice(0,8)}.${extension === 'jpeg' ? 'jpg' : extension}`
}

function disposition(filename: string): string {
  const ascii = filename.normalize('NFKD').replace(/[^a-zA-Z0-9._ -]/g,'').replace(/"/g,'') || 'mesajify-media'
  const encoded = encodeURIComponent(filename).replace(/['()*]/g,char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

function bytesMatchType(bytes: Buffer, extension: string): boolean {
  if (extension === 'png') return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  if (extension === 'jpg' || extension === 'jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (extension === 'webp') return bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP'
  return bytes.length >= 12 && bytes.toString('ascii',4,8) === 'ftyp'
}

async function target(creative: DownloadCreative, deps: DownloadDependencies) {
  if (creative.status !== 'ready' && !(creative.status === 'needs_review' && (creative.format === 'video' || libraryVideoOutputId(creative.public_url)))) throw new DownloadError(409, 'Medya henüz indirmeye hazır değil.')
  const payload = record(creative.payload)
  const outputId = libraryVideoOutputId(creative.public_url)
  if (creative.format === 'video' || outputId) {
    if (!outputId) throw new DownloadError(422, 'Onaylanmış final video kaydı bulunamadı.')
    const output = await deps.output(outputId)
    if (!output || output.org_id !== deps.orgId) throw new DownloadError(404, 'Medya bulunamadı.')
    if (!isApprovedFinalVideoOutput(output) || !SHA.test(output.sha256 || '') || !Number.isSafeInteger(Number(output.byte_size)) || Number(output.byte_size) <= 0) {
      throw new DownloadError(422, 'Video kalite kontrolü veya final dosya doğrulaması tamamlanmamış.')
    }
    // file_path is the persisted FINAL output, not a guessed job/raw alias or client URL.
    return {url:signedGatewayDownload(output.file_path,deps.orgId,deps.gatewayOrigin,deps.mediaSigningSecret),
      extension:'mp4',sha:output.sha256.toLowerCase(),size:Number(output.byte_size),max:512 * 1024 * 1024}
  }
  if (!isImageReviewApproved(payload)) throw new DownloadError(422, 'Görselin müşteri onayı tamamlanmamış.')
  const key = creative.storage_path || ''
  if (!validStorageKey(key,deps.orgId)) throw new DownloadError(404, 'Kayıtlı görsel dosyası bulunamadı.')
  const extension = key.split('.').pop()?.toLowerCase() || ''
  if (!TYPES[extension] || extension === 'mp4') throw new DownloadError(415, 'Görsel biçimi desteklenmiyor.')
  const signed = await deps.signStorage(key)
  if (!signed) throw new DownloadError(404, 'Kayıtlı görsel dosyası bulunamadı.')
  const url = new URL(signed)
  const expectedPath = `/storage/v1/object/sign/creatives/${key}`
  if (url.origin !== new URL(deps.storageOrigin).origin || decodeURIComponent(url.pathname) !== expectedPath) {
    throw new DownloadError(502, 'Güvenli depolama adresi doğrulanamadı.')
  }
  const receipt = record(payload.imageOutputReceipt)
  const sha = typeof receipt.sha256 === 'string' ? receipt.sha256 : payload.outputSha256
  return {url:url.toString(),extension,sha:typeof sha === 'string' && SHA.test(sha) ? sha.toLowerCase() : null,
    size:Number(receipt.size) > 0 ? Number(receipt.size) : null,max:25 * 1024 * 1024}
}

/** Authenticate in the route; authorize again against owned DB rows before any upstream I/O. */
export async function serveCreativeDownload(request: Request, id: string, deps: DownloadDependencies): Promise<Response> {
  let cleanup: (() => Promise<void>) | undefined
  try {
    if (!UUID.test(id)) throw new DownloadError(400, 'Medya kimliği geçersiz.')
    const creative = await deps.creative(id)
    if (!creative || creative.org_id !== deps.orgId) throw new DownloadError(404, 'Medya bulunamadı.')
    const file = await target(creative,deps)
    const upstream = await deps.fetch(file.url,{method:request.method === 'HEAD' ? 'HEAD' : 'GET',cache:'no-store',redirect:'error',
      signal:AbortSignal.any([request.signal,AbortSignal.timeout(120_000)])})
    if (upstream.status === 404) throw new DownloadError(404, 'Medya dosyası silinmiş veya eksik.')
    if (!upstream.ok || upstream.status !== 200) throw new DownloadError(502, 'Medya dosyasına güvenli erişim sağlanamadı.')
    const suppliedType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (suppliedType && suppliedType !== 'application/octet-stream' && suppliedType !== TYPES[file.extension]) {
      await upstream.body?.cancel()
      throw new DownloadError(502, 'Medya dosyasının içerik tipi uyuşmuyor.')
    }
    const reported = Number(upstream.headers.get('content-length'))
    if (reported > file.max || (file.size && reported > 0 && reported !== file.size)) {
      await upstream.body?.cancel()
      throw new DownloadError(502, 'Medya dosyasının boyutu doğrulanamadı.')
    }
    const headers = new Headers({...PRIVATE_HEADERS,'Content-Type':TYPES[file.extension],
      'Content-Disposition':disposition(downloadFilename(creative.title,creative.id,file.extension))})
    if (request.method === 'HEAD') {
      await upstream.body?.cancel()
      if (file.size || reported > 0) headers.set('Content-Length',String(file.size || reported))
      return new Response(null,{headers})
    }
    if (!upstream.body) throw new DownloadError(502, 'Medya dosyası boş.')
    // Spool with bounded memory, verify the exact bytes before releasing a download.
    // A second upstream GET could race a replaced file; serve the verified local file instead.
    const directory = await mkdtemp(join(tmpdir(),'mesajify-download-'))
    const pathname = join(directory,'media')
    cleanup = async () => { await unlink(pathname).catch(() => {}); await rmdir(directory).catch(() => {}) }
    const destination = await open(pathname,'wx',0o600)
    const reader = upstream.body.getReader()
    const hash = createHash('sha256')
    let size = 0, prefix = Buffer.alloc(0)
    try {
      while (true) {
        const {value,done} = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > file.max) throw new DownloadError(413, 'Medya dosyası indirme sınırını aşıyor.')
        if (prefix.length < 64) prefix = Buffer.concat([prefix,Buffer.from(value.subarray(0,64 - prefix.length))])
        hash.update(value)
        // FileHandle.write may write fewer bytes than requested.
        let offset = 0
        while (offset < value.length) offset += (await destination.write(value,offset,value.length - offset)).bytesWritten
      }
    } finally {
      await reader.cancel().catch(() => {}); reader.releaseLock(); await destination.close()
    }
    const actualSha = hash.digest('hex')
    if (!size || !bytesMatchType(prefix,file.extension) || (file.sha && file.sha !== actualSha) || (file.size && file.size !== size) || (reported > 0 && reported !== size)) {
      throw new DownloadError(502, 'Medya bütünlüğü doğrulanamadı. İndirme başlatılmadı.')
    }
    headers.set('Content-Length',String(size))
    headers.set('ETag',`"${actualSha}"`)
    const stream = createReadStream(pathname)
    const remove = cleanup
    stream.once('close',() => { void remove() })
    cleanup = undefined
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>,{headers})
  } catch (error) {
    await cleanup?.()
    const known = error instanceof DownloadError
    if (!known) console.error('[creative-download]',{creativeId:id,errorType:error instanceof Error ? error.name : 'unknown'})
    return Response.json({error:known ? error.message : 'Medya indirilemedi. Lütfen tekrar deneyin.'},{status:known ? error.status : 502,headers:PRIVATE_HEADERS})
  }
}
