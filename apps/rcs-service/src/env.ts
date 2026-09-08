import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'rcs' as const
export const KIND = 'messaging' as const

export type RcsConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadRcsConfig(overrides: Partial<RcsConfig> = {}): RcsConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || 'https://rcsbusinessmessaging.googleapis.com',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3002)
  },
  get mockMode() {
    return loadRcsConfig().mockMode
  },
  get liveEnabled() {
    return loadRcsConfig().liveEnabled
  },
  get token() {
    return loadRcsConfig().token
  },
  get apiBase() {
    return loadRcsConfig().apiBase
  },
  get orgId() {
    return loadRcsConfig().orgId
  },
  get accountId() {
    return loadRcsConfig().accountId
  },
  get verifyToken() {
    return loadRcsConfig().verifyToken
  },
}
