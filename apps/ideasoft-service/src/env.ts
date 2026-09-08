import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'ideasoft' as const
export const KIND = 'commerce' as const

export type IdeasoftConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadIdeasoftConfig(overrides: Partial<IdeasoftConfig> = {}): IdeasoftConfig {
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
    return intEnv('PORT', 3012)
  },
  get mockMode() {
    return loadIdeasoftConfig().mockMode
  },
  get liveEnabled() {
    return loadIdeasoftConfig().liveEnabled
  },
  get token() {
    return loadIdeasoftConfig().token
  },
  get apiBase() {
    return loadIdeasoftConfig().apiBase
  },
  get orgId() {
    return loadIdeasoftConfig().orgId
  },
  get accountId() {
    return loadIdeasoftConfig().accountId
  },
  get verifyToken() {
    return loadIdeasoftConfig().verifyToken
  },
}
