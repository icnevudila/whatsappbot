import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = ['hubspot', 'zendesk', 'calendar'] as const
export const KIND = 'crm' as const

export type CrmConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
  provider: string
}

export function loadCrmConfig(overrides: Partial<CrmConfig> = {}): CrmConfig {
  const providers = Array.isArray(CHANNEL) ? CHANNEL : [CHANNEL]
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || '',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    provider: process.env.CRM_PROVIDER?.trim() || providers[0]!,
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3017)
  },
  get mockMode() {
    return loadCrmConfig().mockMode
  },
  get liveEnabled() {
    return loadCrmConfig().liveEnabled
  },
  get token() {
    return loadCrmConfig().token
  },
  get apiBase() {
    return loadCrmConfig().apiBase
  },
  get orgId() {
    return loadCrmConfig().orgId
  },
  get accountId() {
    return loadCrmConfig().accountId
  },
  get verifyToken() {
    return loadCrmConfig().verifyToken
  },
  get provider() {
    return loadCrmConfig().provider
  },
}
