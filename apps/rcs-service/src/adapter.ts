import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { loadRcsConfig, type RcsConfig } from './env.js'

function cfg(overrides?: Partial<RcsConfig>): RcsConfig {
  return loadRcsConfig(overrides)
}

export function rcsAgentMessagePath(phone: string): string {
  return `/v1/phones/${encodeURIComponent(phone)}/agentMessages`
}

export function rcsAgentMessageUrl(apiBase: string, phone: string): string {
  return `${apiBase.replace(/\/$/, '')}${rcsAgentMessagePath(phone)}`
}

export function parseInbound(raw: unknown, config?: Partial<RcsConfig>): ChannelEvent | null {
  const c = cfg(config)
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const phone = String(body.senderPhoneNumber ?? body.msisdn ?? body.threadId ?? '')
  const text =
    typeof body.text === 'string'
      ? body.text
      : typeof body.messageText === 'string'
        ? body.messageText
        : undefined
  if (!phone) return null
  return buildChannelEvent({
    channel: 'rcs',
    orgId: c.orgId,
    accountId: c.accountId,
    direction: 'inbound',
    externalThreadId: phone,
    externalMessageId: typeof body.messageId === 'string' ? body.messageId : undefined,
    senderId: phone,
    text,
    payload: body,
  })
}

export async function sendMessage(
  input: SendMessageInput,
  config?: Partial<RcsConfig>,
): Promise<SendMessageResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, externalMessageId: `mock-rcs-${Date.now()}`, mock: true }
  }

  try {
    const res = await fetch(rcsAgentMessageUrl(c.apiBase, input.threadId), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${c.token}`,
      },
      body: JSON.stringify({ contentMessage: { text: input.text } }),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, externalMessageId: `rcs-${Date.now()}`, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}
