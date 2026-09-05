/**
 * Meta WhatsApp Cloud API (WABA) iskeleti.
 * Baileys ile paralel kanal: WABA_ACCESS_TOKEN + WABA_PHONE_NUMBER_ID set ise
 * sendTextCloudApi kullanilabilir. Varsayilan yol hâlâ Baileys.
 */
import { env } from './env.js'
import { logger } from './logger.js'

const log = logger.child({ scope: 'waba' })

export function isWabaConfigured(): boolean {
  return Boolean(
    process.env.WABA_ACCESS_TOKEN?.trim() && process.env.WABA_PHONE_NUMBER_ID?.trim(),
  )
}

export async function sendTextCloudApi(options: {
  toE164: string
  body: string
}): Promise<{ messageId: string | null }> {
  const token = process.env.WABA_ACCESS_TOKEN?.trim()
  const phoneId = process.env.WABA_PHONE_NUMBER_ID?.trim()
  if (!token || !phoneId) {
    throw new Error('WABA yapilandirilmadi')
  }

  const to = options.toE164.replace(/^\+/, '')
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: options.body },
    }),
  })

  const data = (await res.json()) as {
    messages?: Array<{ id?: string }>
    error?: { message?: string }
  }

  if (!res.ok) {
    log.error({ err: data.error, worker: env.workerId }, 'WABA send failed')
    throw new Error(data.error?.message ?? `WABA ${res.status}`)
  }

  return { messageId: data.messages?.[0]?.id ?? null }
}
