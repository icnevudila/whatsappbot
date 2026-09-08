import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'tsoft' as const
export const KIND = 'commerce' as const

export type TsoftConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadTsoftConfig(overrides: Partial<TsoftConfig> = {}): TsoftConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || '',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3010)
  },
  get mockMode() {
    return loadTsoftConfig().mockMode
  },
  get liveEnabled() {
    return loadTsoftConfig().liveEnabled
  },
  get token() {
    return loadTsoftConfig().token
  },
  get apiBase() {
    return loadTsoftConfig().apiBase
  },
  get orgId() {
    return loadTsoftConfig().orgId
  },
  get accountId() {
    return loadTsoftConfig().accountId
  },
  get verifyToken() {
    return loadTsoftConfig().verifyToken
  },
}
