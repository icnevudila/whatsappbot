import { downloadMediaMessage, type WAMessage, type WASocket } from '@whiskeysockets/baileys'
import { env } from './env.js'
import { logger } from './logger.js'

const BUCKET = 'chat-media'

type MediaKind = 'image' | 'sticker' | 'video' | 'audio' | 'document'

function supabaseConfig(): { url: string; key: string } | null {
  const url = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    'https://rnkrjmblgcdqlyslbhob.supabase.co'
  ).trim()
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJua3JqbWJsZ2NkcWx5c2xiaG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTE2OTQsImV4cCI6MjEwNDAyNzY5NH0.PXOKu-TTcxKaJQKFcA-QSN7ukwK3NuPJvVpzYRpMDXg'
  ).trim()
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key }
}

function mimeFromMessage(message: WAMessage, kind: MediaKind): string {
  const content = message.message
  if (!content) return 'application/octet-stream'
  if (kind === 'image' && content.imageMessage?.mimetype) return content.imageMessage.mimetype
  if (kind === 'sticker' && content.stickerMessage?.mimetype) return content.stickerMessage.mimetype
  if (kind === 'video' && content.videoMessage?.mimetype) return content.videoMessage.mimetype
  if (kind === 'audio' && content.audioMessage?.mimetype) return content.audioMessage.mimetype
  if (kind === 'document' && content.documentMessage?.mimetype) {
    return content.documentMessage.mimetype
  }
  if (kind === 'image' || kind === 'sticker') return 'image/jpeg'
  if (kind === 'video') return 'video/mp4'
  if (kind === 'audio') return 'audio/ogg'
  return 'application/octet-stream'
}

function extFromMime(mime: string): string {
  const base = mime.split(';')[0]?.trim().toLowerCase() ?? ''
  if (base === 'image/jpeg' || base === 'image/jpg') return 'jpg'
  if (base === 'image/png') return 'png'
  if (base === 'image/webp') return 'webp'
  if (base === 'image/gif') return 'gif'
  if (base === 'video/mp4') return 'mp4'
  if (base === 'video/quicktime') return 'mov'
  if (base === 'audio/ogg' || base === 'audio/opus') return 'ogg'
  if (base === 'audio/mpeg') return 'mp3'
  if (base === 'application/pdf') return 'pdf'
  return 'bin'
}

function isSupportedKind(type: string): type is MediaKind {
  return (
    type === 'image' ||
    type === 'sticker' ||
    type === 'video' ||
    type === 'audio' ||
    type === 'document'
  )
}

function numberFromProto(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value === 'object') {
    const longLike = value as { toNumber?: () => number; toString?: () => string }
    if (typeof longLike.toNumber === 'function') return longLike.toNumber()
    if (typeof longLike.toString === 'function') {
      const parsed = Number.parseInt(longLike.toString(), 10)
      return Number.isFinite(parsed) ? parsed : null
    }
  }
  return null
}

function advertisedFileLength(message: WAMessage, kind: MediaKind): number | null {
  const content = message.message
  if (!content) return null
  if (kind === 'image') return numberFromProto(content.imageMessage?.fileLength)
  if (kind === 'sticker') return numberFromProto(content.stickerMessage?.fileLength)
  if (kind === 'video') return numberFromProto(content.videoMessage?.fileLength)
  if (kind === 'audio') return numberFromProto(content.audioMessage?.fileLength)
  if (kind === 'document') return numberFromProto(content.documentMessage?.fileLength)
  return null
}

/**
 * Baileys medyasını indirip chat-media bucket'a yükler.
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY / ANON_KEY ile yukleme yapar.
 */
export async function storeInboundMedia(options: {
  orgId: string
  accountId: string
  waMessageId: string | null
  messageType: string
  message: WAMessage
  sock: WASocket
}): Promise<string | null> {
  const { orgId, accountId, waMessageId, messageType, message, sock } = options
  if (!isSupportedKind(messageType)) return null

  const cfg = supabaseConfig()
  if (!cfg) {
    logger.warn('inbound-media: SUPABASE_URL / key yok — görsel atlandı')
    return null
  }

  const maxBytes = env.inboundMediaMaxBytes
  if (maxBytes <= 0) {
    logger.info({ accountId, waMessageId }, 'inbound-media: kayit kapali')
    return null
  }

  const expectedBytes = advertisedFileLength(message, messageType)
  if (expectedBytes !== null && expectedBytes > maxBytes) {
    logger.warn(
      { accountId, waMessageId, bytes: expectedBytes, maxBytes },
      'inbound-media: buyuk medya indirilmeden atlandi',
    )
    return null
  }

  let buffer: Buffer
  try {
    const downloaded = await downloadMediaMessage(
      message,
      'buffer',
      {},
      {
        logger: logger as never,
        reuploadRequest: sock.updateMediaMessage.bind(sock),
      },
    )
    buffer = Buffer.isBuffer(downloaded) ? downloaded : Buffer.from(downloaded as ArrayBuffer)
  } catch (error) {
    logger.warn({ err: error, accountId, waMessageId }, 'inbound-media: indirme başarısız')
    return null
  }

  if (!buffer.length || buffer.length > maxBytes) {
    logger.warn(
      { accountId, waMessageId, bytes: buffer.length, maxBytes },
      'inbound-media: boyut uygun değil',
    )
    return null
  }

  const mime = mimeFromMessage(message, messageType)
  const ext = extFromMime(mime)
  const fileId = (waMessageId ?? String(Date.now())).replace(/[^a-zA-Z0-9_-]/g, '_')
  const path = `${orgId}/inbound/${accountId}/${fileId}.${ext}`

  try {
    const response = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: buffer,
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      logger.warn(
        { accountId, waMessageId, status: response.status, detail: detail.slice(0, 200) },
        'inbound-media: storage yükleme başarısız',
      )
      return null
    }
  } catch (error) {
    logger.warn({ err: error, accountId, waMessageId }, 'inbound-media: storage isteği başarısız')
    return null
  }

  return `${cfg.url}/storage/v1/object/public/${BUCKET}/${path}`
}
