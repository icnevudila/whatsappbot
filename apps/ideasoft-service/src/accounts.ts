import { CHANNEL, env, hasDatabase } from './env.js'
import { getDb } from './db.js'

export type ChannelAccountRow = {
  id: string
  org_id: string
  channel: string
  label: string
  status: string
  credentials: Record<string, unknown>
  metadata: Record<string, unknown>
}

const mockAccounts = new Map<string, ChannelAccountRow>()

function ensureMockDefault(): ChannelAccountRow {
  const existing = mockAccounts.get(env.accountId)
  if (existing) return existing
  const row: ChannelAccountRow = {
    id: env.accountId,
    org_id: env.orgId,
    channel: CHANNEL,
    label: 'mock-ideasoft',
    status: 'connected',
    credentials: env.token ? { access_token: env.token, token: env.token } : {},
    metadata: {},
  }
  mockAccounts.set(row.id, row)
  return row
}

export async function loadChannelAccount(id: string): Promise<ChannelAccountRow | null> {
  const db = getDb()
  if (!db || !hasDatabase) {
    if (id === env.accountId) return ensureMockDefault()
    return mockAccounts.get(id) ?? null
  }

  return db.one<ChannelAccountRow>(
    `select id::text, org_id::text, channel, label, status,
            coalesce(credentials, '{}'::jsonb) as credentials,
            coalesce(metadata, '{}'::jsonb) as metadata
       from public.channel_accounts
      where id = $1::uuid
      limit 1`,
    [id],
  )
}

export async function accountHealthCounts(): Promise<{ live: number; error: number }> {
  const db = getDb()
  if (!db || !hasDatabase) {
    const connected = ensureMockDefault()
    return {
      live: connected.status === 'connected' ? 1 : 0,
      error: connected.status === 'error' ? 1 : 0,
    }
  }

  const rows = await db.query<{ status: string; n: string }>(
    `select status, count(*)::text as n
       from public.channel_accounts
      where channel = $1
        and status in ('connected', 'error')
      group by status`,
    [CHANNEL],
  )
  let live = 0
  let error = 0
  for (const row of rows) {
    const n = Number(row.n)
    if (row.status === 'connected') live = n
    if (row.status === 'error') error = n
  }
  return { live, error }
}

export function tokenFromCredentials(credentials: Record<string, unknown>): string {
  const token =
    (typeof credentials.access_token === 'string' && credentials.access_token) ||
    (typeof credentials.token === 'string' && credentials.token) ||
    (typeof credentials.api_key === 'string' && credentials.api_key) ||
    ''
  return token.trim()
}
