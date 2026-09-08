import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = ['sap', 'oracle', 'ifs', 'nebim'] as const
export const KIND = 'erp' as const

export type ErpConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
  provider: string
}

export function loadErpConfig(overrides: Partial<ErpConfig> = {}): ErpConfig {
  const providers = Array.isArray(CHANNEL) ? CHANNEL : [CHANNEL]
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || '',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    provider: process.env.ERP_PROVIDER?.trim() || providers[0]!,
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3016)
  },
  get mockMode() {
    return loadErpConfig().mockMode
  },
  get liveEnabled() {
    return loadErpConfig().liveEnabled
  },
  get token() {
    return loadErpConfig().token
  },
  get apiBase() {
    return loadErpConfig().apiBase
  },
  get orgId() {
    return loadErpConfig().orgId
  },
  get accountId() {
    return loadErpConfig().accountId
  },
  get verifyToken() {
    return loadErpConfig().verifyToken
  },
  get provider() {
    return loadErpConfig().provider
  },
}
