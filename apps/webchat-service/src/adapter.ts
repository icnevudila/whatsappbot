import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { loadWebchatConfig, type WebchatConfig } from './env.js'
import { append, clearThreads, getThread } from './store.js'

export { getThread, append, clearThreads }

function cfg(overrides?: Partial<WebchatConfig>): WebchatConfig {
  return loadWebchatConfig(overrides)
}

export function webchatSendPath(): string {
  return '/send'
}

export function webchatSendUrl(apiBase: string): string {
  return `${apiBase.replace(/\/$/, '')}${webchatSendPath()}`
}

export function parseInbound(raw: unknown, config?: Partial<WebchatConfig>): ChannelEvent | null {
  const c = cfg(config)
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const text = typeof body.text === 'string' ? body.text : undefined
  if (!text) return null
  const threadId = String(body.threadId ?? body.sessionId ?? body.senderId ?? 'anon')
  const senderId = String(body.senderId ?? threadId)
  const event = buildChannelEvent({
    channel: 'webchat',
    orgId: c.orgId,
    accountId: c.accountId,
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

export async function sendMessage(
  input: SendMessageInput,
  config?: Partial<WebchatConfig>,
): Promise<SendMessageResult> {
  const c = cfg(config)
  const id =
    c.mockMode || !c.liveEnabled || !c.token ? `mock-webchat-${Date.now()}` : `webchat-${Date.now()}`

  append(input.threadId, {
    id,
    text: input.text,
    senderId: 'agent',
    direction: 'outbound',
    at: new Date().toISOString(),
  })

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, externalMessageId: id, mock: true }
  }

  try {
    const res = await fetch(webchatSendUrl(c.apiBase), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${c.token}`,
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
