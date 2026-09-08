import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'webchat' as const
export const KIND = 'messaging' as const

export type WebchatConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadWebchatConfig(overrides: Partial<WebchatConfig> = {}): WebchatConfig {
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
    return intEnv('PORT', 3005)
  },
  get mockMode() {
    return loadWebchatConfig().mockMode
  },
  get liveEnabled() {
    return loadWebchatConfig().liveEnabled
  },
  get token() {
    return loadWebchatConfig().token
  },
  get apiBase() {
    return loadWebchatConfig().apiBase
  },
  get orgId() {
    return loadWebchatConfig().orgId
  },
  get accountId() {
    return loadWebchatConfig().accountId
  },
  get verifyToken() {
    return loadWebchatConfig().verifyToken
  },
}
