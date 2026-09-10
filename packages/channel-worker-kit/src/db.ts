import pg from 'pg'

const { Pool } = pg

function resolveSsl(): boolean | { rejectUnauthorized: boolean } {
  const mode = (process.env.PG_SSL ?? 'require').trim().toLowerCase()
  if (mode === 'false' || mode === 'disable' || mode === 'off') return false
  const rejectUnauthorized =
    (process.env.PG_SSL_REJECT_UNAUTHORIZED ?? 'false').trim().toLowerCase() === 'true'
  return { rejectUnauthorized }
}

export type CreatePoolOptions = {
  databaseUrl: string
  poolMax?: number
  applicationName?: string
  onPoolError?: (error: Error) => void
}

export type QueryFn = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) => Promise<T[]>

export type DbHelpers = {
  pool: pg.Pool
  query: QueryFn
  one: <T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => Promise<T | null>
  tx: <T>(fn: (client: pg.PoolClient) => Promise<T>) => Promise<T>
  closePool: () => Promise<void>
}

export function createPool(opts: CreatePoolOptions): DbHelpers {
  const pool = new Pool({
    connectionString: opts.databaseUrl,
    max: opts.poolMax ?? 10,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
    ssl: resolveSsl(),
    application_name: opts.applicationName ?? 'channel-worker',
  })

  pool.on('error', (error) => {
    opts.onPoolError?.(error)
  })

  async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await pool.query<T>(text, params)
    return result.rows
  }

  async function one<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const rows = await query<T>(text, params)
    return rows[0] ?? null
  }

  async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect()
    try {
      await client.query('begin')
      const result = await fn(client)
      await client.query('commit')
      return result
    } catch (error) {
      try {
        await client.query('rollback')
      } catch {
        /* baglanti kopmussa rollback de patlar */
      }
      throw error
    } finally {
      client.release()
    }
  }

  async function closePool(): Promise<void> {
    await pool.end()
  }

  return { pool, query, one, tx, closePool }
}
