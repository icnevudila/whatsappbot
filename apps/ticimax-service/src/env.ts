import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'ticimax' as const
export const KIND = 'commerce' as const

export type TicimaxConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadTicimaxConfig(overrides: Partial<TicimaxConfig> = {}): TicimaxConfig {
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
    return intEnv('PORT', 3011)
  },
  get mockMode() {
    return loadTicimaxConfig().mockMode
  },
  get liveEnabled() {
    return loadTicimaxConfig().liveEnabled
  },
  get token() {
    return loadTicimaxConfig().token
  },
  get apiBase() {
    return loadTicimaxConfig().apiBase
  },
  get orgId() {
    return loadTicimaxConfig().orgId
  },
  get accountId() {
    return loadTicimaxConfig().accountId
  },
  get verifyToken() {
    return loadTicimaxConfig().verifyToken
  },
}
