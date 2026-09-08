import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'ikas' as const
export const KIND = 'commerce' as const

export type IkasConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadIkasConfig(overrides: Partial<IkasConfig> = {}): IkasConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || 'https://api.myikas.com',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3007)
  },
  get mockMode() {
    return loadIkasConfig().mockMode
  },
  get liveEnabled() {
    return loadIkasConfig().liveEnabled
  },
  get token() {
    return loadIkasConfig().token
  },
  get apiBase() {
    return loadIkasConfig().apiBase
  },
  get orgId() {
    return loadIkasConfig().orgId
  },
  get accountId() {
    return loadIkasConfig().accountId
  },
  get verifyToken() {
    return loadIkasConfig().verifyToken
  },
}
