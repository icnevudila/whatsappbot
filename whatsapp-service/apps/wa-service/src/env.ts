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

export type ServiceRole = 'worker' | 'scaler'

function resolveRole(): ServiceRole {
  const raw = (process.env.ROLE ?? 'worker').trim().toLowerCase()
  if (raw === 'scaler') return 'scaler'
  if (raw === 'worker' || raw === '') return 'worker'
  throw new Error(`ROLE gecersiz: "${raw}". Izin verilen: worker | scaler`)
}

/**
 * Worker icin zorunlu. Scaler icin varsayilan scaler-1.
 * Docker scale: entrypoint WORKER_ID yoksa hostname'den turetir.
 */
function resolveWorkerId(role: ServiceRole): string {
  const value = process.env.WORKER_ID?.trim()
  if (value) return value
  if (role === 'scaler') return 'scaler-1'
  throw new Error(
    'WORKER_ID zorunlu (worker). Ornek: WORKER_ID=oracle-1 veya entrypoint ile otomatik.',
  )
}

function resolveActuator(): 'noop' | 'docker' | 'webhook' {
  const raw = (process.env.SCALE_ACTUATOR ?? 'noop').trim().toLowerCase()
  if (raw === 'noop' || raw === 'docker' || raw === 'webhook') return raw
  throw new Error(`SCALE_ACTUATOR gecersiz: "${raw}". Izin: noop | docker | webhook`)
}

const role = resolveRole()

export const env = {
  role,
  databaseUrl: required('DATABASE_URL'),
  workerId: resolveWorkerId(role),

  dbPoolMax: int('DB_POOL_MAX', role === 'scaler' ? 2 : 10),

  leaseTtlSeconds: int('LEASE_TTL_SECONDS', 60),
  jobPollIntervalMs: int('JOB_POLL_INTERVAL_MS', 2_000),
  jobBatchSize: Math.max(1, int('JOB_BATCH_SIZE', 1)),
  staleJobSeconds: int('STALE_JOB_SECONDS', 900),
  campaignTickMs: int('CAMPAIGN_TICK_MS', 5_000),
  sendTimeoutMs: int('SEND_TIMEOUT_MS', 60_000),
  maxSessions: int('MAX_SESSIONS', 50),
  shutdownDrainMs: int('SHUTDOWN_DRAIN_MS', 90_000),
  healthPort: int('PORT', 8080),
  logLevel: process.env.LOG_LEVEL?.trim() || 'info',
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',

  heartbeatIntervalMs: int('HEARTBEAT_INTERVAL_MS', 20_000),

  /** Scaler */
  scalerIntervalMs: int('SCALER_INTERVAL_MS', 20_000),
  scalerMinWorkers: Math.max(0, int('SCALER_MIN_WORKERS', 1)),
  scalerMaxWorkers: Math.max(1, int('SCALER_MAX_WORKERS', 40)),
  scalerCapacityPerWorker: int('SCALER_CAPACITY_PER_WORKER', 0) || int('MAX_SESSIONS', 50),
  scalerAliveStaleSeconds: int('SCALER_ALIVE_STALE_SECONDS', 90),
  scaleActuator: resolveActuator(),
  scaleWebhookUrl: process.env.SCALE_WEBHOOK_URL?.trim() || null,
  /**
   * Docker actuator: compose dosyasi (repo kokune gore).
   * Ornek: infra/docker-compose.yml — servis adi wa-worker.
   */
  scaleComposeFile: process.env.SCALE_COMPOSE_FILE?.trim() || 'infra/docker-compose.yml',
  scaleComposeService: process.env.SCALE_COMPOSE_SERVICE?.trim() || 'wa-worker',
  scaleComposeProject: process.env.SCALE_COMPOSE_PROJECT?.trim() || 'filo-wa',

  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY?.trim() || null,
  discoverEngine: resolveDiscoverEngine(),
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
