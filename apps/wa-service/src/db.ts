import pg from 'pg'
import { env } from './env.js'
import { logger } from './logger.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.dbPoolMax,
  // Supabase her zaman TLS istiyor. Havuz sertifikasi zincirini Node'un kok
  // deposunda tasimadigi icin dogrulama kapatiliyor; baglanti yine sifreli.
  ssl: { rejectUnauthorized: false },
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
