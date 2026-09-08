import crypto from 'node:crypto'
import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { loadLineConfig, type LineConfig } from './env.js'

type LineEvent = {
  type?: string
  replyToken?: string
  source?: { userId?: string; type?: string }
  message?: { type?: string; id?: string; text?: string }
}

function cfg(overrides?: Partial<LineConfig>): LineConfig {
  return loadLineConfig(overrides)
}

export function verifyLineSignature(body: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false
  const digest = crypto.createHmac('sha256', secret).update(body).digest('base64')
  const a = Buffer.from(digest)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function lineSendPath(replyToken?: string): string {
  return replyToken ? '/v2/bot/message/reply' : '/v2/bot/message/push'
}

export function lineSendUrl(apiBase: string, replyToken?: string): string {
  return `${apiBase.replace(/\/$/, '')}${lineSendPath(replyToken)}`
}

export function parseInbound(raw: unknown, config?: Partial<LineConfig>): ChannelEvent | null {
  const c = cfg(config)
  if (!raw || typeof raw !== 'object') return null
  const body = raw as { events?: LineEvent[]; text?: string; threadId?: string; senderId?: string }

  const first = body.events?.find((e) => e.type === 'message' && e.message?.type === 'text')
  if (first) {
    const threadId = String(first.source?.userId ?? 'unknown')
    return buildChannelEvent({
      channel: 'line',
      orgId: c.orgId,
      accountId: c.accountId,
      direction: 'inbound',
      externalThreadId: threadId,
      externalMessageId: first.message?.id,
      senderId: threadId,
      text: first.message?.text,
      payload: { replyToken: first.replyToken, ...first },
    })
  }

  if (typeof body.text === 'string') {
    const threadId = String(body.threadId ?? body.senderId ?? 'unknown')
    return buildChannelEvent({
      channel: 'line',
      orgId: c.orgId,
      accountId: c.accountId,
      direction: 'inbound',
      externalThreadId: threadId,
      senderId: String(body.senderId ?? threadId),
      text: body.text,
      payload: body as Record<string, unknown>,
    })
  }

  return null
}

export async function sendMessage(
  input: SendMessageInput,
  config?: Partial<LineConfig>,
): Promise<SendMessageResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, externalMessageId: `mock-line-${Date.now()}`, mock: true }
  }

  const replyToken =
    typeof input.metadata?.replyToken === 'string' ? input.metadata.replyToken : undefined

  try {
    const payload = replyToken
      ? {
          replyToken,
          messages: [{ type: 'text', text: input.text }],
        }
      : {
          to: input.threadId,
          messages: [{ type: 'text', text: input.text }],
        }

    const res = await fetch(lineSendUrl(c.apiBase, replyToken), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${c.token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, externalMessageId: `line-${Date.now()}`, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}
