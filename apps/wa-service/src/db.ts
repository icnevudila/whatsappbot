import pg from 'pg'
import { env } from './env.js'
import { logger } from './logger.js'

const { Pool } = pg

function resolveSsl(): boolean | { rejectUnauthorized: boolean } {
  // PG_SSL=false → TLS kapali (nadir local). Varsayilan: TLS acik.
  const mode = (process.env.PG_SSL ?? 'require').trim().toLowerCase()
  if (mode === 'false' || mode === 'disable' || mode === 'off') return false
  // PG_SSL_REJECT_UNAUTHORIZED=true → sertifika dogrula (uretim / ozel CA).
  const rejectUnauthorized =
    (process.env.PG_SSL_REJECT_UNAUTHORIZED ?? 'false').trim().toLowerCase() === 'true'
  return { rejectUnauthorized }
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.dbPoolMax,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
  ssl: resolveSsl(),
  application_name: `wa-service/${env.workerId}`,
})

pool.on('error', (error) => {
  // Bosta duran bir baglanti koptuysa surec olmemeli; havuz yenisini acar.
  logger.error({ err: error }, 'Postgres havuzunda bosta baglanti hatasi')
})

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params)
  return result.rows
}

export async function one<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
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
      // Baglanti zaten kopmussa rollback da patlar; asil hatayi kaybetmeyelim.
    }
    throw error
  } finally {
    client.release()
  }
}

export async function closePool(): Promise<void> {
  await pool.end()
}
