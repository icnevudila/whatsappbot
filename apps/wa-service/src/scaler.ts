import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { one, query } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'

const execFileAsync = promisify(execFile)
const log = logger.child({ scope: 'scaler' })

export type DemandSnapshot = {
  demandAccounts: number
  demandConnectJobs: number
  demand: number
  aliveWorkers: number
  desired: number
  capacityPerWorker: number
}

async function measureDemand(): Promise<Omit<DemandSnapshot, 'desired' | 'capacityPerWorker'>> {
  const accounts = await one<{ n: string }>(
    `select count(*)::text as n
       from public.accounts
      where enabled
        and not is_locked
        and status in ('connected', 'connecting', 'qr_pending', 'pairing_pending')`,
  )

  // Lease'siz (veya suresi dolmus) pending connect — yeni kapasite ister.
  const connectJobs = await one<{ n: string }>(
    `select count(*)::text as n
       from public.jobs j
       left join wa.session_lease sl
         on sl.account_id = j.account_id and sl.expires_at > now()
      where j.status = 'pending'
        and j.type = 'account.connect'
        and j.account_id is not null
        and sl.account_id is null`,
  )

  const alive = await one<{ n: string }>(
    `select count(*)::text as n
       from wa.worker_heartbeat
      where seen_at > now() - make_interval(secs => $1)`,
    [env.scalerAliveStaleSeconds],
  )

  const demandAccounts = Number(accounts?.n ?? 0)
  const demandConnectJobs = Number(connectJobs?.n ?? 0)

  return {
    demandAccounts,
    demandConnectJobs,
    demand: demandAccounts + demandConnectJobs,
    aliveWorkers: Number(alive?.n ?? 0),
  }
}

function clampDesired(demand: number, capacity: number): number {
  const raw = demand <= 0 ? env.scalerMinWorkers : Math.ceil(demand / capacity)
  return Math.min(env.scalerMaxWorkers, Math.max(env.scalerMinWorkers, raw))
}

async function persistState(snapshot: DemandSnapshot, reason: string): Promise<void> {
  await query(
    `insert into wa.scaler_state
       (id, desired_workers, demand, alive_workers, capacity_per_worker, reason, updated_at)
     values (1, $1, $2, $3, $4, $5, now())
     on conflict (id) do update set
       desired_workers = excluded.desired_workers,
       demand = excluded.demand,
       alive_workers = excluded.alive_workers,
       capacity_per_worker = excluded.capacity_per_worker,
       reason = excluded.reason,
       updated_at = now()`,
    [
      snapshot.desired,
      snapshot.demand,
      snapshot.aliveWorkers,
      snapshot.capacityPerWorker,
      reason,
    ],
  )
}

async function actuate(desired: number): Promise<string> {
  if (env.scaleActuator === 'noop') {
    return 'actuator=noop'
  }

  if (env.scaleActuator === 'webhook') {
    if (!env.scaleWebhookUrl) {
      throw new Error('SCALE_ACTUATOR=webhook icin SCALE_WEBHOOK_URL zorunlu')
    }
    const response = await fetch(env.scaleWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        desired_workers: desired,
        service: env.scaleComposeService,
        project: env.scaleComposeProject,
      }),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Webhook ${response.status}: ${body.slice(0, 200)}`)
    }
    return `actuator=webhook status=${response.status}`
  }

  // docker compose scale
  const args = [
    'compose',
    '-f',
    env.scaleComposeFile,
    '-p',
    env.scaleComposeProject,
    '--profile',
    'autoscale',
    'up',
    '-d',
    '--no-recreate',
    '--scale',
    `${env.scaleComposeService}=${desired}`,
    env.scaleComposeService,
  ]

  const { stdout, stderr } = await execFileAsync('docker', args, {
    cwd: process.cwd(),
    timeout: 120_000,
    maxBuffer: 2_000_000,
  })
  const detail = `${stdout} ${stderr}`.trim().slice(0, 300)
  return `actuator=docker scale=${desired} ${detail}`
}

export async function scalerTick(): Promise<DemandSnapshot> {
  const capacity = env.scalerCapacityPerWorker
  const base = await measureDemand()
  const desired = clampDesired(base.demand, capacity)
  const snapshot: DemandSnapshot = {
    ...base,
    desired,
    capacityPerWorker: capacity,
  }

  const reason = `demand=${snapshot.demand} (accounts=${snapshot.demandAccounts}+connect=${snapshot.demandConnectJobs}) alive=${snapshot.aliveWorkers} → desired=${desired}`
  await persistState(snapshot, reason)

  try {
    const act = await actuate(desired)
    log.info({ ...snapshot, act }, 'Scaler tick')
  } catch (error) {
    log.error({ err: error, ...snapshot }, 'Actuator basarisiz (desired DB yazildi)')
  }

  return snapshot
}

let timer: ReturnType<typeof setInterval> | undefined

export function startScaler(): void {
  void scalerTick().catch((error) => {
    log.error({ err: error }, 'Ilk scaler tick basarisiz')
  })

  timer = setInterval(() => {
    void scalerTick().catch((error) => {
      log.error({ err: error }, 'Scaler tick basarisiz')
    })
  }, env.scalerIntervalMs)

  log.info(
    {
      intervalMs: env.scalerIntervalMs,
      min: env.scalerMinWorkers,
      max: env.scalerMaxWorkers,
      capacity: env.scalerCapacityPerWorker,
      actuator: env.scaleActuator,
    },
    'Scaler basladi',
  )
}

export function stopScaler(): void {
  if (timer) clearInterval(timer)
  timer = undefined
}
