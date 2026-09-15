import { downloadMediaMessage, type WAMessage, type WASocket } from '@whiskeysockets/baileys'
import { logger } from './logger.js'

const BUCKET = 'chat-media'
const MAX_BYTES = 12 * 1024 * 1024

type MediaKind = 'image' | 'sticker' | 'video' | 'audio' | 'document'

function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
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
  return type === 'image' || type === 'sticker' || type === 'video'
}

/**
 * Baileys medyasını indirip chat-media bucket'a yükler.
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY yoksa null döner.
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
    logger.warn('inbound-media: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok — görsel atlandı')
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

  if (!buffer.length || buffer.length > MAX_BYTES) {
    logger.warn(
      { accountId, waMessageId, bytes: buffer.length },
      'inbound-media: boyut uygun değil',
    )
    return null
  }

  const mime = mimeFromMessage(message, messageType)
  const ext = extFromMime(mime)
  const fileId = (waMessageId ?? `${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_')
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
