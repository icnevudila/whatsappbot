import {
  buildChannelEvent,
  type ChannelEvent,
  type ChannelId,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { env } from './env.js'

type MetaMessaging = {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: string | number
  message?: { mid?: string; text?: string }
}

function detectChannel(objectType: string | undefined): ChannelId {
  if (objectType === 'instagram') return 'instagram'
  return 'facebook'
}

/** Meta webhook entry → ChannelEvent listesi */
export function parseMetaWebhook(raw: unknown): ChannelEvent[] {
  if (!raw || typeof raw !== 'object') return []
  const body = raw as {
    object?: string
    entry?: Array<{
      id?: string
      messaging?: MetaMessaging[]
      changes?: unknown[]
    }>
  }

  const channel = detectChannel(body.object)
  const events: ChannelEvent[] = []

  for (const entry of body.entry ?? []) {
    for (const item of entry.messaging ?? []) {
      const text = item.message?.text
      const senderId = String(item.sender?.id ?? 'unknown')
      const threadId = senderId
      events.push(
        buildChannelEvent({
          channel,
          orgId: env.orgId,
          accountId: env.accountId,
          direction: 'inbound',
          externalThreadId: threadId,
          externalMessageId: item.message?.mid,
          senderId,
          text,
          payload: item as unknown as Record<string, unknown>,
          occurredAt: item.timestamp
            ? new Date(Number(item.timestamp)).toISOString()
            : undefined,
        }),
      )
    }
  }

  // Sade test payload
  if (events.length === 0 && 'text' in (raw as object)) {
    const simple = parseInbound(raw)
    if (simple) events.push(simple)
  }

  return events
}

export function parseInbound(raw: unknown): ChannelEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  if (body.object === 'page' || body.object === 'instagram' || Array.isArray(body.entry)) {
    return parseMetaWebhook(raw)[0] ?? null
  }

  const text = typeof body.text === 'string' ? body.text : undefined
  const threadId = String(body.threadId ?? body.senderId ?? 'unknown')
  const channel: ChannelId = body.channel === 'instagram' ? 'instagram' : 'facebook'

  return buildChannelEvent({
    channel,
    orgId: env.orgId,
    accountId: env.accountId,
    direction: 'inbound',
    externalThreadId: threadId,
    externalMessageId: typeof body.messageId === 'string' ? body.messageId : undefined,
    senderId: String(body.senderId ?? threadId),
    text,
    payload: body,
  })
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return {
      ok: true,
      externalMessageId: `mock-${input.channel}-${Date.now()}`,
      mock: true,
    }
  }

  const pageId = String(input.metadata?.pageId ?? env.accountId)
  const apiBase = env.apiBase || 'https://graph.facebook.com/v21.0'

  try {
    const res = await fetch(`${apiBase}/${pageId}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.token}`,
      },
      body: JSON.stringify({
        recipient: { id: input.threadId },
        messaging_type: 'RESPONSE',
        message: { text: input.text },
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { ok: false, error: `http_${res.status}:${errText.slice(0, 200)}` }
    }
    const data = (await res.json()) as { message_id?: string }
    return { ok: true, externalMessageId: data.message_id ?? `live-${Date.now()}` }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'META_SEND_FAILED',
    }
  }
}

export function verifyWebhookChallenge(
  mode: string | null,
  token: string | null,
  challenge: string | null,
): string | null {
  if (mode === 'subscribe' && token === env.verifyToken && challenge) return challenge
  return null
}
