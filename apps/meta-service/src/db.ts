import { createPool, type DbHelpers } from '@wa/channel-worker-kit'
import { env } from './env.js'

let helpers: DbHelpers | null = null

export function getDb(): DbHelpers | null {
  return helpers
}

export function initDb(): DbHelpers | null {
  if (!env.databaseUrl) {
    helpers = null
    return null
  }
  if (helpers) return helpers
  helpers = createPool({
    databaseUrl: env.databaseUrl,
    poolMax: env.dbPoolMax,
    applicationName: `meta-service/${env.workerId}`,
  })
  return helpers
}

export async function pingDb(): Promise<boolean> {
  const db = getDb()
  if (!db) return true
  try {
    await db.pool.query('select 1')
    return true
  } catch {
    return false
  }
}

export async function closeDb(): Promise<void> {
  if (helpers) {
    await helpers.closePool().catch(() => undefined)
    helpers = null
  }
}
