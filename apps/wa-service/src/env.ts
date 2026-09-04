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

/**
 * WORKER_ID zorunlu: yoksa her boot random id uretir ve crash sonrasi
 * requeueOwnJobs eski isleri bulamaz (orphan claimed/running).
 */
function requireWorkerId(): string {
  const value = process.env.WORKER_ID?.trim()
  if (!value) {
    throw new Error(
      'WORKER_ID zorunlu. Ornek: WORKER_ID=oracle-1 (her process icin benzersiz sabit deger).',
    )
  }
  return value
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
  workerId: requireWorkerId(),

  dbPoolMax: int('DB_POOL_MAX', 10),

  /** Kira suresi ve yenileme araligi. Yenileme TTL'in ucte biri kadar sik. */
  leaseTtlSeconds: int('LEASE_TTL_SECONDS', 60),

  jobPollIntervalMs: int('JOB_POLL_INTERVAL_MS', 2_000),
  /** Cift islem riskini azaltmak icin varsayilan 1. */
  jobBatchSize: Math.max(1, int('JOB_BATCH_SIZE', 1)),

  /** Stuck claimed/running isler icin reclaim esigi (saniye). Scrape/discover uzun sürebilir. */
  staleJobSeconds: int('STALE_JOB_SECONDS', 900),

  campaignTickMs: int('CAMPAIGN_TICK_MS', 5_000),

  /**
   * Baileys icinde bazi operasyonlar zaman asimi olmayan tek bir mutex uzerinde
   * serilesiyor; park etmis bir gonderim o hesaptaki her seyi susturabiliyor.
   * Bu yuzden her gonderime ust sinir koyuyoruz.
   */
  sendTimeoutMs: int('SEND_TIMEOUT_MS', 60_000),

  /** Tek process'te acilacak azami oturum. */
  maxSessions: int('MAX_SESSIONS', 50),

  /** Graceful shutdown'da in-flight drain suresi. */
  shutdownDrainMs: int('SHUTDOWN_DRAIN_MS', 20_000),

  healthPort: int('PORT', 8080),
  logLevel: process.env.LOG_LEVEL?.trim() || 'info',
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',

  /**
   * Google Places API (New) — yerel işletme keşfi.
   * Yoksa contacts.discover Playwright Maps’e düşer (DISCOVER_ENGINE=playwright zorlar).
   */
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY?.trim() || null,

  /** places | playwright | auto (varsayılan: key varsa places) */
  discoverEngine: resolveDiscoverEngine(),

  /**
   * Places Text Search üst sınırı (tek arama = tek API isteği, sayfalama yok).
   * Ücretsiz kotayı korumak için varsayılan 20, tavan 20.
   */
  discoverMaxResults: Math.min(20, Math.max(5, int('DISCOVER_MAX_RESULTS', 20))),
} as const

function resolveDiscoverEngine(): 'auto' | 'places' | 'playwright' {
  const raw = process.env.DISCOVER_ENGINE?.trim().toLowerCase() || 'auto'
  if (raw !== 'auto' && raw !== 'places' && raw !== 'playwright') {
    throw new Error(
      `DISCOVER_ENGINE gecersiz: "${raw}". Izin verilen: auto | places | playwright`,
    )
  }
  if (raw === 'places' && !(process.env.GOOGLE_MAPS_API_KEY?.trim())) {
    throw new Error('DISCOVER_ENGINE=places icin GOOGLE_MAPS_API_KEY zorunlu')
  }
  return raw
}

export const isProduction = env.nodeEnv === 'production'
