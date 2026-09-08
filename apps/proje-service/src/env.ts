import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'proje' as const
export const KIND = 'commerce' as const

export type ProjeConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadProjeConfig(overrides: Partial<ProjeConfig> = {}): ProjeConfig {
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
    return intEnv('PORT', 3013)
  },
  get mockMode() {
    return loadProjeConfig().mockMode
  },
  get liveEnabled() {
    return loadProjeConfig().liveEnabled
  },
  get token() {
    return loadProjeConfig().token
  },
  get apiBase() {
    return loadProjeConfig().apiBase
  },
  get orgId() {
    return loadProjeConfig().orgId
  },
  get accountId() {
    return loadProjeConfig().accountId
  },
  get verifyToken() {
    return loadProjeConfig().verifyToken
  },
}
