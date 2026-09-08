import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'trendyol' as const
export const KIND = 'marketplace' as const

export type TrendyolConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiSecret: string
  sellerId: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadTrendyolConfig(overrides: Partial<TrendyolConfig> = {}): TrendyolConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || process.env.TRENDYOL_API_KEY?.trim() || '',
    apiSecret: process.env.TRENDYOL_API_SECRET?.trim() || '',
    sellerId: process.env.TRENDYOL_SELLER_ID?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || 'https://apigw.trendyol.com',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3014)
  },
  get mockMode() {
    return loadTrendyolConfig().mockMode
  },
  get liveEnabled() {
    return loadTrendyolConfig().liveEnabled
  },
  get token() {
    return loadTrendyolConfig().token
  },
  get apiSecret() {
    return loadTrendyolConfig().apiSecret
  },
  get sellerId() {
    return loadTrendyolConfig().sellerId
  },
  get apiBase() {
    return loadTrendyolConfig().apiBase
  },
  get orgId() {
    return loadTrendyolConfig().orgId
  },
  get accountId() {
    return loadTrendyolConfig().accountId
  },
  get verifyToken() {
    return loadTrendyolConfig().verifyToken
  },
}
