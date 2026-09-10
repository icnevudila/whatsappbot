import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { loadWechatConfig, type WechatConfig } from './env.js'

function cfg(overrides?: Partial<WechatConfig>): WechatConfig {
  return loadWechatConfig(overrides)
}

export function wechatSendPath(): string {
  return '/cgi-bin/message/custom/send'
}

export function wechatSendUrl(apiBase: string): string {
  return `${apiBase.replace(/\/$/, '')}${wechatSendPath()}`
}

export function parseInbound(raw: unknown, config?: Partial<WechatConfig>): ChannelEvent | null {
  const c = cfg(config)
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>

  if (body.MsgType === 'text' || body.msgType === 'text') {
    const threadId = String(body.FromUserName ?? body.fromUserName ?? 'unknown')
    return buildChannelEvent({
      channel: 'wechat',
      orgId: c.orgId,
      accountId: c.accountId,
      direction: 'inbound',
      externalThreadId: threadId,
      externalMessageId: String(body.MsgId ?? body.msgId ?? ''),
      senderId: threadId,
      text: String(body.Content ?? body.content ?? ''),
      payload: body,
    })
  }

  const text = typeof body.text === 'string' ? body.text : undefined
  const threadId = String(body.threadId ?? body.senderId ?? 'unknown')
  return buildChannelEvent({
    channel: 'wechat',
    orgId: c.orgId,
    accountId: c.accountId,
    direction: 'inbound',
    externalThreadId: threadId,
    senderId: String(body.senderId ?? threadId),
    text,
    payload: body,
  })
}

export async function sendMessage(
  input: SendMessageInput,
  config?: Partial<WechatConfig>,
): Promise<SendMessageResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, externalMessageId: `mock-wechat-${Date.now()}`, mock: true }
  }

  try {
    const res = await fetch(wechatSendUrl(c.apiBase), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${c.token}`,
      },
      body: JSON.stringify({
        touser: input.threadId,
        msgtype: 'text',
        text: { content: input.text },
      }),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json().catch(() => ({}))) as { msgid?: string; id?: string }
    return {
      ok: true,
      externalMessageId: data.msgid ?? data.id ?? `wechat-${Date.now()}`,
      mock: false,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}
