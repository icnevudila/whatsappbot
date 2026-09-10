import process from 'node:process'
import {
  assertEnum,
  intEnv,
  requiredEnv,
  resolveWorkerId,
} from '@wa/channel-worker-kit'
import { boolEnv, isMockMode } from '@wa/channel-runtime'

export const CHANNEL = ['instagram', 'facebook'] as const
export const KIND = 'messaging' as const
/** Job claim filtresi: comma-separated (claim_channel_jobs multi). */
export const JOB_CHANNEL = 'instagram,facebook' as const

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
    if (mockMode) return 'meta-mock-1'
    throw error
  }
}

const mockMode = isMockMode(true)

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
  port: intEnv('PORT', 3001),
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
  get pageId() {
    return loadMetaConfig().pageId
  },
} as const

export const hasDatabase = Boolean(env.databaseUrl)

export function resolveMetaJobChannel(raw?: unknown): 'instagram' | 'facebook' {
  if (raw && typeof raw === 'object') {
    const body = raw as { object?: string; channel?: string }
    if (body.channel === 'instagram' || body.channel === 'facebook') return body.channel
    if (body.object === 'instagram') return 'instagram'
    if (body.object === 'page') return 'facebook'
  }
  return CHANNEL[0]
}
