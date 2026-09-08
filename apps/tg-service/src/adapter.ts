import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { loadTgConfig, type TgConfig } from './env.js'

function cfg(overrides?: Partial<TgConfig>): TgConfig {
  return loadTgConfig(overrides)
}

/** Telegram Update / callback / sade JSON → ChannelEvent */
export function parseInbound(raw: unknown, config?: Partial<TgConfig>): ChannelEvent | null {
  const c = cfg(config)
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>

  const callback = body.callback_query as
    | { id?: string; data?: string; from?: { id?: number }; message?: Record<string, unknown> }
    | undefined

  if (callback?.message) {
    const chat = callback.message.chat as { id?: number | string } | undefined
    const threadId = String(chat?.id ?? 'unknown')
    return buildChannelEvent({
      channel: 'telegram',
      orgId: c.orgId,
      accountId: c.accountId,
      direction: 'inbound',
      externalThreadId: threadId,
      externalMessageId: callback.id ? `cb:${callback.id}` : undefined,
      senderId: String(callback.from?.id ?? threadId),
      text: callback.data,
      payload: body,
    })
  }

  const updateMessage =
    (body.message as Record<string, unknown> | undefined) ||
    (body.edited_message as Record<string, unknown> | undefined)

  if (updateMessage && typeof updateMessage === 'object') {
    const chat = updateMessage.chat as { id?: number | string } | undefined
    const from = updateMessage.from as { id?: number | string } | undefined
    const text =
      typeof updateMessage.text === 'string'
        ? updateMessage.text
        : typeof updateMessage.caption === 'string'
          ? updateMessage.caption
          : undefined
    const threadId = String(chat?.id ?? body.chatId ?? 'unknown')
    const senderId = String(from?.id ?? body.senderId ?? threadId)
    const externalMessageId =
      updateMessage.message_id !== undefined ? String(updateMessage.message_id) : undefined

    return buildChannelEvent({
      channel: 'telegram',
      orgId: c.orgId,
      accountId: c.accountId,
      direction: 'inbound',
      externalThreadId: threadId,
      externalMessageId,
      senderId,
      text,
      payload: body,
    })
  }

  const text = typeof body.text === 'string' ? body.text : undefined
  const threadId = String(body.threadId ?? body.chatId ?? body.senderId ?? 'unknown')
  const senderId = String(body.senderId ?? body.from ?? threadId)
  const externalMessageId =
    typeof body.messageId === 'string' ? body.messageId : typeof body.id === 'string' ? body.id : undefined

  return buildChannelEvent({
    channel: 'telegram',
    orgId: c.orgId,
    accountId: c.accountId,
    direction: 'inbound',
    externalThreadId: threadId,
    externalMessageId,
    senderId,
    text,
    payload: body,
  })
}

export function telegramSendUrl(apiBase: string, token: string): string {
  const root = apiBase.replace(/\/$/, '')
  return `${root}/bot${token}/sendMessage`
}

/**
 * Gönderim: mock veya Telegram Bot HTTP API (grammY yerine doğrudan fetch —
 * testlerde local mock server ile canlı path doğrulanır).
 */
export async function sendMessage(
  input: SendMessageInput,
  config?: Partial<TgConfig>,
): Promise<SendMessageResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      externalMessageId: `mock-telegram-${Date.now()}`,
      mock: true,
    }
  }

  const chatIdRaw = input.threadId
  const chatIdNum = Number(chatIdRaw)
  const chat_id = Number.isFinite(chatIdNum) ? chatIdNum : chatIdRaw

  try {
    const res = await fetch(telegramSendUrl(c.apiBase, c.token), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text: input.text,
        parse_mode: typeof input.metadata?.parse_mode === 'string' ? input.metadata.parse_mode : undefined,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      result?: { message_id?: number }
      description?: string
    }
    if (!res.ok || data.ok === false) {
      return {
        ok: false,
        error: data.description ?? `http_${res.status}`,
        code: 'TELEGRAM_SEND_FAILED',
        mock: false,
      }
    }
    return {
      ok: true,
      externalMessageId: String(data.result?.message_id ?? `tg-${Date.now()}`),
      mock: false,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'TELEGRAM_SEND_FAILED',
      mock: false,
    }
  }
}
