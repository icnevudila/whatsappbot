import process from 'node:process'
import {
  assertEnum,
  intEnv,
  requiredEnv,
  resolveWorkerId,
} from '@wa/channel-worker-kit'
import { boolEnv, isMockMode } from '@wa/channel-runtime'

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

function resolveDatabaseUrl(mockMode: boolean): string | null {
  const url = process.env.DATABASE_URL?.trim() || null
  if (url) return url
  if (mockMode) return null
  throw new Error(
    'DATABASE_URL zorunlu (MOCK_MODE=false). Test icin MOCK_MODE=true veya DATABASE_URL set edin.',
  )
}

function resolveWorkerIdSafe(mockMode: boolean): string {
  try {
    return resolveWorkerId('worker')
  } catch (error) {
    if (mockMode) return 'woo-mock-1'
    throw error
  }
}

const mockMode = isMockMode(true)

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

const role = assertEnum('ROLE', (process.env.ROLE ?? 'worker').trim().toLowerCase() || 'worker', [
  'worker',
] as const)

export const env = {
  role,
  mockMode,
  databaseUrl: resolveDatabaseUrl(mockMode),
  workerId: resolveWorkerIdSafe(mockMode),
  dbPoolMax: intEnv('DB_POOL_MAX', 10),
  jobPollIntervalMs: intEnv('JOB_POLL_INTERVAL_MS', 2_000),
  jobBatchSize: Math.max(1, intEnv('JOB_BATCH_SIZE', 1)),
  staleJobSeconds: intEnv('STALE_JOB_SECONDS', 900),
  heartbeatIntervalMs: intEnv('HEARTBEAT_INTERVAL_MS', 20_000),
  shutdownDrainMs: intEnv('SHUTDOWN_DRAIN_MS', 90_000),
  port: intEnv('PORT', 3008),
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

} as const

export const hasDatabase = Boolean(env.databaseUrl)
