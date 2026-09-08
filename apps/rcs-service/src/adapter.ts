import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { env } from './env.js'

export function parseInbound(raw: unknown): ChannelEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const phone = String(body.senderPhoneNumber ?? body.msisdn ?? body.threadId ?? '')
  const text = typeof body.text === 'string' ? body.text : typeof body.messageText === 'string' ? body.messageText : undefined
  if (!phone) return null
  return buildChannelEvent({
    channel: 'rcs',
    orgId: env.orgId,
    accountId: env.accountId,
    direction: 'inbound',
    externalThreadId: phone,
    externalMessageId: typeof body.messageId === 'string' ? body.messageId : undefined,
    senderId: phone,
    text,
    payload: body,
  })
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return { ok: true, externalMessageId: `mock-rcs-${Date.now()}`, mock: true }
  }
  const base = env.apiBase || 'https://rcsbusinessmessaging.googleapis.com'
  try {
    const res = await fetch(`${base}/v1/phones/${encodeURIComponent(input.threadId)}/agentMessages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.token}`,
      },
      body: JSON.stringify({ contentMessage: { text: input.text } }),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    return { ok: true, externalMessageId: `rcs-${Date.now()}`, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
