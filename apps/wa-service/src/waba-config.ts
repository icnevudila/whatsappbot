/** WABA env kontrolu — logger/env import etmez (test-safe). */

export function isWabaConfigured(): boolean {
  return Boolean(
    process.env.WABA_ACCESS_TOKEN?.trim() && process.env.WABA_PHONE_NUMBER_ID?.trim(),
  )
}

export function isWabaSendChannel(): boolean {
  return (process.env.SEND_CHANNEL ?? '').trim().toLowerCase() === 'waba'
}

export type WabaMessageSendDecision =
  | { channel: 'baileys' }
  | { channel: 'waba' }
  | { channel: 'fail'; reason: string }

/**
 * message.send kanal karari.
 * SEND_CHANNEL=waba iken Baileys'e sessiz dusmez: eksik config veya medya = net fail.
 */
export function resolveWabaMessageSend(payload: {
  media_url?: string | null
  message_type?: string | null
}): WabaMessageSendDecision {
  if (!isWabaSendChannel()) return { channel: 'baileys' }

  if (!isWabaConfigured()) {
    return {
      channel: 'fail',
      reason:
        'SEND_CHANNEL=waba ancak WABA_ACCESS_TOKEN ve/veya WABA_PHONE_NUMBER_ID eksik; Baileys yedegine dusulmedi',
    }
  }

  const messageType = payload.message_type ?? (payload.media_url ? 'image' : 'text')
  if (payload.media_url || messageType !== 'text') {
    return {
      channel: 'fail',
      reason:
        'SEND_CHANNEL=waba iken medya desteklenmiyor (yalnizca text); Baileys yedegine dusulmedi',
    }
  }

  return { channel: 'waba' }
}
