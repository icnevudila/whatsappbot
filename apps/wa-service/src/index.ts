import http from 'node:http'
import process from 'node:process'
import {
  drainCampaignRunner,
  startCampaignRunner,
  stopCampaignRunner,
} from './campaign-runner.js'
import { closePool, pool } from './db.js'
import { env } from './env.js'
import { startHeartbeat, stopHeartbeat } from './heartbeat.js'
import {
  drainJobConsumer,
  pendingJobCount,
  reclaimStaleJobs,
  requeueOwnJobs,
  staleClaimedJobCount,
  startJobConsumer,
  stopJobConsumer,
} from './job-consumer.js'
import { releaseOwnStaleLeases } from './lease.js'
import { logger } from './logger.js'
import { startScaler, stopScaler } from './scaler.js'
import { sessionManager } from './session-manager.js'
import { initMonitoring, captureException } from './monitoring.js'

initMonitoring()

const HEALTH_CHECK_INTERVAL_MS = 60_000
const STALE_JOB_RECLAIM_INTERVAL_MS = 60_000

let shuttingDown = false

async function buildHealthPayload(): Promise<{ status: number; body: unknown }> {
  let dbOk = false
  try {
    await pool.query('select 1')
    dbOk = true
  } catch {
    dbOk = false
  }

  if (env.role === 'scaler') {
    return {
      status: dbOk ? 200 : 503,
      body: {
        role: 'scaler',
        worker: env.workerId,
        healthy: dbOk,
        ready: dbOk,
        db: dbOk,
        actuator: env.scaleActuator,
        limits: {
          min: env.scalerMinWorkers,
          max: env.scalerMaxWorkers,
          capacityPerWorker: env.scalerCapacityPerWorker,
        },
        uptimeSeconds: Math.round(process.uptime()),
      },
    }
  }

  const report = await sessionManager.healthReport()
  const pending = await pendingJobCount().catch(() => -1)
  const staleClaimed = await staleClaimedJobCount().catch(() => -1)

  const healthy = dbOk
  const ready =
    dbOk && (report.tracked === 0 || report.live > 0) && report.stale.length === 0

  return {
    status: healthy ? 200 : 503,
    body: {
      role: 'worker',
      worker: env.workerId,
      healthy,
      ready,
      degraded: report.stale.length > 0 || (report.tracked > 0 && report.live === 0),
      db: dbOk,
      sessions: {
        tracked: report.tracked,
        live: report.live,
        stale: report.stale,
        max: env.maxSessions,
        free: Math.max(0, env.maxSessions - report.tracked),
      },
      capacity: {
        maxSessions: env.maxSessions,
        dbPoolMax: env.dbPoolMax,
        note:
          'Filo kapasitesi = tum worker MAX_SESSIONS toplami. Autoscale: docs/autoscale.md',
        sentry: Boolean(process.env.SENTRY_DSN?.trim()),
      },
      jobs: { pending, staleClaimed },
      uptimeSeconds: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '0.0.0',
    },
  }
}

function startHealthServer(): http.Server {
  const server = http.createServer((request, response) => {
    if (request.url === '/health' || request.url === '/' || request.url === '/ready') {
      void buildHealthPayload()
        .then(({ status, body }) => {
          const readyOnly = request.url === '/ready'
          const payload = body as { ready?: boolean }
          const code = readyOnly ? (payload.ready ? 200 : 503) : status
          response.writeHead(code, { 'content-type': 'application/json' })
          response.end(JSON.stringify(body, null, 2))
        })
        .catch((error) => {
          response.writeHead(500, { 'content-type': 'application/json' })
          response.end(JSON.stringify({ error: String(error) }))
        })
      return
    }

    response.writeHead(404)
    response.end()
  })

  server.listen(env.healthPort, () => {
    logger.info({ port: env.healthPort, role: env.role }, 'Sağlık ucu dinliyor')
  })

  return server
}

async function mainWorker(): Promise<void> {
  logger.info({ worker: env.workerId, maxSessions: env.maxSessions }, 'Worker basliyor')

  await pool.query('select 1')
  logger.info('Postgres baglantisi tamam')

  const requeued = await requeueOwnJobs()
  const staleReclaimed = await reclaimStaleJobs()
  const releasedLeases = await releaseOwnStaleLeases()
  if (requeued > 0 || staleReclaimed > 0 || releasedLeases > 0) {
    logger.info(
      { requeued, staleReclaimed, releasedLeases },
      'Onceki calisma kalintilari temizlendi',
    )
  }

  await sessionManager.resumeAll()

  startJobConsumer()
  startCampaignRunner()
  startHeartbeat()

  const server = startHealthServer()

  const healthTimer = setInterval(() => {
    void sessionManager.reviveStale().catch((error) => {
      logger.error({ err: error }, 'Saglik kontrolu basarisiz')
    })
  }, HEALTH_CHECK_INTERVAL_MS)

  const reclaimTimer = setInterval(() => {
    void reclaimStaleJobs()
      .then((n) => {
        if (n > 0) logger.warn({ count: n }, 'Stale isler kuyruga alindi')
      })
      .catch((error) => {
        logger.error({ err: error }, 'Stale job reclaim basarisiz')
      })
  }, STALE_JOB_RECLAIM_INTERVAL_MS)

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'Kapanis basladi')

    stopJobConsumer()
    stopCampaignRunner()
    stopHeartbeat()
    clearInterval(healthTimer)
    clearInterval(reclaimTimer)

    await Promise.all([
      drainJobConsumer(env.shutdownDrainMs),
      drainCampaignRunner(env.shutdownDrainMs),
    ])

    await sessionManager.shutdownAll()

    await requeueOwnJobs().catch((error) => {
      logger.warn({ err: error }, 'Isler kuyruga geri konamadi')
    })

    await new Promise<void>((resolve) => server.close(() => resolve()))
    await closePool().catch(() => undefined)

    logger.info('Kapanis tamam')
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('unhandledRejection', (reason) => {
    captureException(reason, { kind: 'unhandledRejection' })
    logger.error({ err: reason }, 'Yakalanmamis promise reddi')
  })
  process.on('uncaughtException', (error) => {
    captureException(error, { kind: 'uncaughtException' })
    logger.fatal({ err: error }, 'Yakalanmamis istisna, kapaniliyor')
    void shutdown('uncaughtException')
  })
}

async function mainScaler(): Promise<void> {
  logger.info(
    {
      id: env.workerId,
      actuator: env.scaleActuator,
      min: env.scalerMinWorkers,
      max: env.scalerMaxWorkers,
    },
    'Scaler basliyor',
  )

  await pool.query('select 1')
  startScaler()
  const server = startHealthServer()

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'Scaler kapanis')
    stopScaler()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await closePool().catch(() => undefined)
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

async function main(): Promise<void> {
  if (env.role === 'scaler') {
    await mainScaler()
    return
  }
  await mainWorker()
}

void main().catch((error) => {
  logger.fatal({ err: error }, 'Servis baslatilamadi')
  process.exit(1)
})
