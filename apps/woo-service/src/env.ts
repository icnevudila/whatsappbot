import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'woocommerce' as const
export const KIND = 'commerce' as const

export type WooConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadWooConfig(overrides: Partial<WooConfig> = {}): WooConfig {
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
    return intEnv('PORT', 3008)
  },
  get mockMode() {
    return loadWooConfig().mockMode
  },
  get liveEnabled() {
    return loadWooConfig().liveEnabled
  },
  get token() {
    return loadWooConfig().token
  },
  get apiBase() {
    return loadWooConfig().apiBase
  },
  get orgId() {
    return loadWooConfig().orgId
  },
  get accountId() {
    return loadWooConfig().accountId
  },
  get verifyToken() {
    return loadWooConfig().verifyToken
  },
}
