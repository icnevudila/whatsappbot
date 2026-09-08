import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = ['instagram', 'facebook'] as const

export type MetaConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
  pageId: string
}

export function loadMetaConfig(overrides: Partial<MetaConfig> = {}): MetaConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || 'https://graph.facebook.com/v21.0',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    pageId: process.env.META_PAGE_ID?.trim() || 'sample-page-id',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3001)
  },
  get mockMode() {
    return loadMetaConfig().mockMode
  },
  get liveEnabled() {
    return loadMetaConfig().liveEnabled
  },
  get token() {
    return loadMetaConfig().token
  },
  get apiBase() {
    return loadMetaConfig().apiBase
  },
  get orgId() {
    return loadMetaConfig().orgId
  },
  get accountId() {
    return loadMetaConfig().accountId
  },
  get verifyToken() {
    return loadMetaConfig().verifyToken
  },
}
