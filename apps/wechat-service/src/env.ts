import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'wechat' as const
export const KIND = 'messaging' as const

export type WechatConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
  verifyToken: string
}

export function loadWechatConfig(overrides: Partial<WechatConfig> = {}): WechatConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || 'https://api.weixin.qq.com',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
    ...overrides,
  }
}

export const env = {
  get port() {
    return intEnv('PORT', 3004)
  },
  get mockMode() {
    return loadWechatConfig().mockMode
  },
  get liveEnabled() {
    return loadWechatConfig().liveEnabled
  },
  get token() {
    return loadWechatConfig().token
  },
  get apiBase() {
    return loadWechatConfig().apiBase
  },
  get orgId() {
    return loadWechatConfig().orgId
  },
  get accountId() {
    return loadWechatConfig().accountId
  },
  get verifyToken() {
    return loadWechatConfig().verifyToken
  },
}
