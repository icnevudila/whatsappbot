import { query } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { sessionManager } from './session-manager.js'

const log = logger.child({ scope: 'heartbeat' })

export async function upsertWorkerHeartbeat(): Promise<void> {
  if (env.role !== 'worker') return

  const report = await sessionManager.healthReport()

  await query(
    `insert into wa.worker_heartbeat
       (worker_id, max_sessions, tracked, live, db_pool_max, seen_at, meta)
     values ($1, $2, $3, $4, $5, now(), $6::jsonb)
     on conflict (worker_id) do update set
       max_sessions = excluded.max_sessions,
       tracked = excluded.tracked,
       live = excluded.live,
       db_pool_max = excluded.db_pool_max,
       seen_at = now(),
       meta = excluded.meta`,
    [
      env.workerId,
      env.maxSessions,
      report.tracked,
      report.live,
      env.dbPoolMax,
      JSON.stringify({
        stale: report.stale.length,
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
      }),
    ],
  )
}

let timer: ReturnType<typeof setInterval> | undefined

export function startHeartbeat(): void {
  if (env.role !== 'worker') return

  void upsertWorkerHeartbeat().catch((error) => {
    log.warn({ err: error }, 'Ilk heartbeat yazilamadi')
  })

  timer = setInterval(() => {
    void upsertWorkerHeartbeat().catch((error) => {
      log.warn({ err: error }, 'Heartbeat yazilamadi')
    })
  }, env.heartbeatIntervalMs)
}

export function stopHeartbeat(): void {
  if (timer) clearInterval(timer)
  timer = undefined
}
