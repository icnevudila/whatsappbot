import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'line' as const
export const KIND = 'messaging' as const

export type LineConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
  channelSecret: string
}

export function loadLineConfig(overrides: Partial<LineConfig> = {}): LineConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || 'https://api.line.me',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    channelSecret: process.env.CHANNEL_SECRET?.trim() || '',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3003)
  },
  get mockMode() {
    return loadLineConfig().mockMode
  },
  get liveEnabled() {
    return loadLineConfig().liveEnabled
  },
  get token() {
    return loadLineConfig().token
  },
  get apiBase() {
    return loadLineConfig().apiBase
  },
  get orgId() {
    return loadLineConfig().orgId
  },
  get accountId() {
    return loadLineConfig().accountId
  },
  get verifyToken() {
    return loadLineConfig().verifyToken
  },
  get channelSecret() {
    return loadLineConfig().channelSecret
  },
}
