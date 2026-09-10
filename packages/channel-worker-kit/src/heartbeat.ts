import type { WorkerLogger } from './logger.js'

type QueryFn = <T>(sql: string, params?: unknown[]) => Promise<T[]>

export type HeartbeatOptions = {
  query: QueryFn
  workerId: string
  channel: string
  intervalMs: number
  logger: WorkerLogger
  getStats?: () =>
    | { tracked?: number; live?: number; dbPoolMax?: number; meta?: Record<string, unknown> }
    | Promise<{ tracked?: number; live?: number; dbPoolMax?: number; meta?: Record<string, unknown> }>
}

let timer: ReturnType<typeof setInterval> | undefined
let activeOpts: HeartbeatOptions | undefined

export async function upsertChannelWorkerHeartbeat(opts: HeartbeatOptions): Promise<void> {
  const stats = (await opts.getStats?.()) ?? {}
  await opts.query(
    `insert into public.channel_worker_heartbeat
       (worker_id, channel, tracked, live, db_pool_max, seen_at, meta)
     values ($1, $2, $3, $4, $5, now(), $6::jsonb)
     on conflict (worker_id) do update set
       channel = excluded.channel,
       tracked = excluded.tracked,
       live = excluded.live,
       db_pool_max = excluded.db_pool_max,
       seen_at = now(),
       meta = excluded.meta`,
    [
      opts.workerId,
      opts.channel,
      stats.tracked ?? 0,
      stats.live ?? 0,
      stats.dbPoolMax ?? 0,
      JSON.stringify({
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
        ...(stats.meta ?? {}),
      }),
    ],
  )
}

export function startHeartbeat(opts: HeartbeatOptions): void {
  stopHeartbeat()
  activeOpts = opts
  const log = opts.logger.child({ scope: 'heartbeat' })

  void upsertChannelWorkerHeartbeat(opts).catch((error) => {
    log.warn({ err: error }, 'Ilk heartbeat yazilamadi')
  })

  timer = setInterval(() => {
    if (!activeOpts) return
    void upsertChannelWorkerHeartbeat(activeOpts).catch((error) => {
      log.warn({ err: error }, 'Heartbeat yazilamadi')
    })
  }, opts.intervalMs)
}

export function stopHeartbeat(): void {
  if (timer) clearInterval(timer)
  timer = undefined
  activeOpts = undefined
}
