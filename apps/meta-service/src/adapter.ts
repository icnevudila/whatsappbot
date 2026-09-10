import {
  buildChannelEvent,
  type ChannelEvent,
  type ChannelId,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { loadMetaConfig, type MetaConfig } from './env.js'

type MetaMessaging = {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: string | number
  message?: { mid?: string; text?: string; attachments?: unknown[] }
  postback?: { payload?: string; title?: string }
}

function detectChannel(objectType: string | undefined): ChannelId {
  if (objectType === 'instagram') return 'instagram'
  return 'facebook'
}

export function parseMetaWebhook(raw: unknown, config?: Partial<MetaConfig>): ChannelEvent[] {
  const c = loadMetaConfig(config)
  if (!raw || typeof raw !== 'object') return []
  const body = raw as {
    object?: string
    entry?: Array<{ id?: string; messaging?: MetaMessaging[]; changes?: unknown[] }>
  }

  const channel = detectChannel(body.object)
  const events: ChannelEvent[] = []

  for (const entry of body.entry ?? []) {
    for (const item of entry.messaging ?? []) {
      const text = item.message?.text ?? item.postback?.payload ?? item.postback?.title
      const senderId = String(item.sender?.id ?? 'unknown')
      events.push(
        buildChannelEvent({
          channel,
          orgId: c.orgId,
          accountId: c.accountId,
          direction: 'inbound',
          externalThreadId: senderId,
          externalMessageId: item.message?.mid,
          senderId,
          text,
          payload: item as unknown as Record<string, unknown>,
          occurredAt: item.timestamp ? new Date(Number(item.timestamp)).toISOString() : undefined,
        }),
      )
    }
  }

  if (events.length === 0 && 'text' in (raw as object)) {
    const simple = parseInbound(raw, config)
    if (simple) events.push(simple)
  }

  return events
}

export function parseInbound(raw: unknown, config?: Partial<MetaConfig>): ChannelEvent | null {
  const c = loadMetaConfig(config)
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  if (body.object === 'page' || body.object === 'instagram' || Array.isArray(body.entry)) {
    return parseMetaWebhook(raw, config)[0] ?? null
  }

  const text = typeof body.text === 'string' ? body.text : undefined
  const threadId = String(body.threadId ?? body.senderId ?? 'unknown')
  const channel: ChannelId = body.channel === 'instagram' ? 'instagram' : 'facebook'

  return buildChannelEvent({
    channel,
    orgId: c.orgId,
    accountId: c.accountId,
    direction: 'inbound',
    externalThreadId: threadId,
    externalMessageId: typeof body.messageId === 'string' ? body.messageId : undefined,
    senderId: String(body.senderId ?? threadId),
    text,
    payload: body,
  })
}

export function metaSendUrl(apiBase: string, pageId: string): string {
  return `${apiBase.replace(/\/$/, '')}/${pageId}/messages`
}

export async function sendMessage(
  input: SendMessageInput,
  config?: Partial<MetaConfig>,
): Promise<SendMessageResult> {
  const c = loadMetaConfig(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      externalMessageId: `mock-${input.channel}-${Date.now()}`,
      mock: true,
    }
  }

  const pageId = String(input.metadata?.pageId ?? c.pageId)

  try {
    const res = await fetch(metaSendUrl(c.apiBase, pageId), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${c.token}`,
      },
      body: JSON.stringify({
        recipient: { id: input.threadId },
        messaging_type: 'RESPONSE',
        message: { text: input.text },
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { ok: false, error: `http_${res.status}:${errText.slice(0, 200)}`, mock: false }
    }
    const data = (await res.json()) as { message_id?: string }
    return { ok: true, externalMessageId: data.message_id ?? `live-${Date.now()}`, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'META_SEND_FAILED',
      mock: false,
    }
  }
}

export function verifyWebhookChallenge(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  config?: Partial<MetaConfig>,
): string | null {
  const c = loadMetaConfig(config)
  if (mode === 'subscribe' && token === c.verifyToken && challenge) return challenge
  return null
}
