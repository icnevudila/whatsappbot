import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = 'rcs' as const
export const KIND = 'messaging' as const

export const env = {
  port: intEnv('PORT', 3002),
  mockMode: isMockMode(true),
  orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
  accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
  token: process.env.CHANNEL_TOKEN?.trim() || '',
  verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
  apiBase: process.env.API_BASE?.trim() || '',
  liveEnabled: boolEnv('LIVE_ENABLED', false),
}
