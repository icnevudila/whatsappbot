import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { env, CHANNEL } from './env.js'

const primary = Array.isArray(CHANNEL) ? CHANNEL[0] : CHANNEL

export function parseInbound(raw: unknown): ChannelEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const text =
    typeof body.text === 'string'
      ? body.text
      : typeof (body.message as { text?: string } | undefined)?.text === 'string'
        ? (body.message as { text: string }).text
        : undefined
  const threadId = String(body.threadId ?? body.chatId ?? body.senderId ?? 'unknown')
  const senderId = String(body.senderId ?? body.from ?? threadId)
  const externalMessageId =
    typeof body.messageId === 'string' ? body.messageId : typeof body.id === 'string' ? body.id : undefined

  return buildChannelEvent({
    channel: primary,
    orgId: env.orgId,
    accountId: env.accountId,
    direction: 'inbound',
    externalThreadId: threadId,
    externalMessageId,
    senderId,
    text,
    payload: body,
  })
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return {
      ok: true,
      externalMessageId: `mock-${primary}-${Date.now()}`,
      mock: true,
    }
  }

  // Canli yollar servis ozelinde genisletilir; burada guvenli fallback.
  try {
    const res = await fetch(`${env.apiBase || 'https://example.invalid'}/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.token}`,
      },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}`, mock: false }
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, externalMessageId: data.id ?? `live-${Date.now()}`, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}
