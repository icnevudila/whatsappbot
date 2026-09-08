import { CHANNEL_IDS, type ChannelEvent, type ChannelId } from './types.js'

export function isChannelId(value: string): value is ChannelId {
  return (CHANNEL_IDS as readonly string[]).includes(value)
}

export function normalizeText(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined
  const trimmed = input.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function makeEventId(channel: ChannelId, externalId?: string): string {
  const suffix = externalId?.trim() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${channel}:${suffix}`
}

export function buildChannelEvent(
  partial: Omit<ChannelEvent, 'id' | 'occurredAt'> & {
    id?: string
    occurredAt?: string
  },
): ChannelEvent {
  return {
    id: partial.id ?? makeEventId(partial.channel, partial.externalMessageId),
    channel: partial.channel,
    orgId: partial.orgId,
    accountId: partial.accountId,
    direction: partial.direction,
    externalThreadId: partial.externalThreadId,
    externalMessageId: partial.externalMessageId,
    senderId: partial.senderId,
    text: normalizeText(partial.text),
    payload: partial.payload,
    occurredAt: partial.occurredAt ?? new Date().toISOString(),
  }
}
