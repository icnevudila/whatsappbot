import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'telegram' as const
export const KIND = 'messaging' as const

export type TgConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadTgConfig(overrides: Partial<TgConfig> = {}): TgConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || 'https://api.telegram.org',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3000)
  },
  get mockMode() {
    return loadTgConfig().mockMode
  },
  get liveEnabled() {
    return loadTgConfig().liveEnabled
  },
  get token() {
    return loadTgConfig().token
  },
  get apiBase() {
    return loadTgConfig().apiBase
  },
  get orgId() {
    return loadTgConfig().orgId
  },
  get accountId() {
    return loadTgConfig().accountId
  },
  get verifyToken() {
    return loadTgConfig().verifyToken
  },
}
