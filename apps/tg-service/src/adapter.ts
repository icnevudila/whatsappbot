import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { Bot } from 'grammy'
import { env } from './env.js'

let bot: Bot | null = null

export function getBot(): Bot | null {
  if (env.mockMode || !env.token) return null
  if (!bot) bot = new Bot(env.token)
  return bot
}

/** Telegram Update veya sade JSON → ChannelEvent */
export function parseInbound(raw: unknown): ChannelEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>

  const updateMessage =
    (body.message as Record<string, unknown> | undefined) ||
    (body.edited_message as Record<string, unknown> | undefined) ||
    (body.callback_query as { message?: Record<string, unknown> } | undefined)?.message

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

  const text = typeof body.text === 'string' ? body.text : undefined
  const threadId = String(body.threadId ?? body.chatId ?? body.senderId ?? 'unknown')
  const senderId = String(body.senderId ?? body.from ?? threadId)
  const externalMessageId =
    typeof body.messageId === 'string' ? body.messageId : typeof body.id === 'string' ? body.id : undefined

  return buildChannelEvent({
    channel: 'telegram',
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
      externalMessageId: `mock-telegram-${Date.now()}`,
      mock: true,
    }
  }

  const instance = getBot()
  if (!instance) {
    return { ok: false, error: 'bot_not_configured', code: 'NO_BOT' }
  }

  try {
    const chatId = Number(input.threadId)
    const msg = await instance.api.sendMessage(
      Number.isFinite(chatId) ? chatId : input.threadId,
      input.text,
    )
    return { ok: true, externalMessageId: String(msg.message_id), mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'TELEGRAM_SEND_FAILED',
    }
  }
}
