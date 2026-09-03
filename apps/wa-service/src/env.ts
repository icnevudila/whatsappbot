import { randomUUID } from 'node:crypto'
import process from 'node:process'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Ortam degiskeni eksik: ${name}. apps/wa-service/.env dosyasini .env.example'a bakarak doldurun.`,
    )
  }
  return value
}

function int(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  /**
   * Supabase Postgres baglanti dizesi.
   * Servis Data API yerine dogrudan Postgres'e baglaniyor: wa semasi bilincli
   * olarak Data API'ye kapali ve is kuyrugu FOR UPDATE SKIP LOCKED ile gercek
   * bir transaction icinde calismali.
   */
  databaseUrl: required('DATABASE_URL'),

  /**
   * Bu process'in kimligi. Oturum kirasinin sahibi bu deger olur, bu yuzden
   * her process icin farkli olmak zorunda.
   */
  workerId: process.env.WORKER_ID?.trim() || `worker-${randomUUID().slice(0, 8)}`,

  dbPoolMax: int('DB_POOL_MAX', 10),

  /** Kira suresi ve yenileme araligi. Yenileme TTL'in ucte biri kadar sik. */
  leaseTtlSeconds: int('LEASE_TTL_SECONDS', 60),

  jobPollIntervalMs: int('JOB_POLL_INTERVAL_MS', 2_000),
  jobBatchSize: int('JOB_BATCH_SIZE', 10),

  campaignTickMs: int('CAMPAIGN_TICK_MS', 5_000),

  /**
   * Baileys icinde bazi operasyonlar zaman asimi olmayan tek bir mutex uzerinde
   * serilesiyor; park etmis bir gonderim o hesaptaki her seyi susturabiliyor.
   * Bu yuzden her gonderime ust sinir koyuyoruz.
   */
  sendTimeoutMs: int('SEND_TIMEOUT_MS', 60_000),

  /** Tek process'te acilacak azami oturum. */
  maxSessions: int('MAX_SESSIONS', 50),

  healthPort: int('PORT', 8080),
  logLevel: process.env.LOG_LEVEL?.trim() || 'info',
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',
} as const

export const isProduction = env.nodeEnv === 'production'
