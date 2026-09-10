import type { ChannelId, HealthSnapshot } from '@wa/channels'

const startedAt = Date.now()

export function buildHealthSnapshot(input: {
  channel: ChannelId | ChannelId[]
  mockMode: boolean
  role: string
  healthy?: boolean
  ready?: boolean
  detail?: string
}): HealthSnapshot {
  return {
    healthy: input.healthy ?? true,
    ready: input.ready ?? true,
    channel: input.channel,
    mockMode: input.mockMode,
    role: input.role,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    detail: input.detail,
  }
}
