import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { env } from './env.js'
import { append, clearThreads, getThread } from './store.js'

export { getThread, append, clearThreads }

export function parseInbound(raw: unknown): ChannelEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const text = typeof body.text === 'string' ? body.text : undefined
  if (!text) return null
  const threadId = String(body.threadId ?? body.sessionId ?? body.senderId ?? 'anon')
  const senderId = String(body.senderId ?? threadId)
  const event = buildChannelEvent({
    channel: 'webchat',
    orgId: env.orgId,
    accountId: env.accountId,
    direction: 'inbound',
    externalThreadId: threadId,
    externalMessageId: typeof body.messageId === 'string' ? body.messageId : undefined,
    senderId,
    text,
    payload: body,
  })
  append(threadId, {
    id: event.id,
    text,
    senderId,
    direction: 'inbound',
    at: event.occurredAt,
  })
  return event
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const id = env.mockMode || !env.liveEnabled || !env.token
    ? `mock-webchat-${Date.now()}`
    : `webchat-${Date.now()}`

  append(input.threadId, {
    id,
    text: input.text,
    senderId: 'agent',
    direction: 'outbound',
    at: new Date().toISOString(),
  })

  if (env.mockMode || !env.liveEnabled || !env.token) {
    return { ok: true, externalMessageId: id, mock: true }
  }

  const base = (env.apiBase || '').replace(/\/$/, '')
  try {
    const res = await fetch(`${base}/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.token}`,
      },
      body: JSON.stringify({ threadId: input.threadId, text: input.text }),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, externalMessageId: id, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}
