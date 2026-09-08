import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'hepsiburada' as const
export const KIND = 'marketplace' as const

export type HepsiburadaConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadHepsiburadaConfig(overrides: Partial<HepsiburadaConfig> = {}): HepsiburadaConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || 'https://marketplace.hepsiburada.com',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3015)
  },
  get mockMode() {
    return loadHepsiburadaConfig().mockMode
  },
  get liveEnabled() {
    return loadHepsiburadaConfig().liveEnabled
  },
  get token() {
    return loadHepsiburadaConfig().token
  },
  get apiBase() {
    return loadHepsiburadaConfig().apiBase
  },
  get orgId() {
    return loadHepsiburadaConfig().orgId
  },
  get accountId() {
    return loadHepsiburadaConfig().accountId
  },
  get verifyToken() {
    return loadHepsiburadaConfig().verifyToken
  },
}
