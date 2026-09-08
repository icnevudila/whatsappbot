import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'magento' as const
export const KIND = 'commerce' as const

export type MagentoConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadMagentoConfig(overrides: Partial<MagentoConfig> = {}): MagentoConfig {
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
    return intEnv('PORT', 3009)
  },
  get mockMode() {
    return loadMagentoConfig().mockMode
  },
  get liveEnabled() {
    return loadMagentoConfig().liveEnabled
  },
  get token() {
    return loadMagentoConfig().token
  },
  get apiBase() {
    return loadMagentoConfig().apiBase
  },
  get orgId() {
    return loadMagentoConfig().orgId
  },
  get accountId() {
    return loadMagentoConfig().accountId
  },
  get verifyToken() {
    return loadMagentoConfig().verifyToken
  },
}
