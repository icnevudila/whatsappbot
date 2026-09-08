import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'shopify' as const
export const KIND = 'commerce' as const

export type ShopifyConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadShopifyConfig(overrides: Partial<ShopifyConfig> = {}): ShopifyConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || process.env.SHOPIFY_SHOP?.trim() || '',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3006)
  },
  get mockMode() {
    return loadShopifyConfig().mockMode
  },
  get liveEnabled() {
    return loadShopifyConfig().liveEnabled
  },
  get token() {
    return loadShopifyConfig().token
  },
  get apiBase() {
    return loadShopifyConfig().apiBase
  },
  get orgId() {
    return loadShopifyConfig().orgId
  },
  get accountId() {
    return loadShopifyConfig().accountId
  },
  get verifyToken() {
    return loadShopifyConfig().verifyToken
  },
}
