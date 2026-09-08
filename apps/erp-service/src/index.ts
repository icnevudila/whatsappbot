import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HealthSnapshot } from '@wa/channels'
import { createHttpServer, sendJson } from '@wa/channel-runtime'
import {
  captureException,
  computeChannelReady,
  createDrainState,
  createJobLoop,
  createWorkerLogger,
  flushMonitoring,
  initMonitoring,
  runChannelWorker,
  startHeartbeat,
  stopHeartbeat,
} from '@wa/channel-worker-kit'
import { lookupOrder, lookupStock } from './adapter.js'
import { accountHealthCounts } from './accounts.js'
import { closeDb, getDb, initDb, pingDb } from './db.js'
import { CHANNEL, env, hasDatabase, JOB_CHANNEL, loadErpConfig } from './env.js'
import { enqueueChannelJob, handleChannelJob } from './job-handlers.js'

const logger = createWorkerLogger('erp-service', env.workerId)
const drainState = createDrainState()
const startedAt = Date.now()

export type ServiceHealth = HealthSnapshot & {
  degraded?: boolean
  draining?: boolean
  db?: boolean
  worker?: string
  jobs?: { pending: number }
}

export async function getHealth(): Promise<ServiceHealth> {
  const draining = drainState.isDraining()
  const dbOk = await pingDb()
  const counts = await accountHealthCounts().catch(() => ({ live: 0, error: 0 }))
  const { healthy, ready, degraded } = computeChannelReady({
    dbOk,
    draining,
    liveAccounts: counts.live,
    errorAccounts: counts.error,
  })

  let pending = -1
  const db = getDb()
  if (db) {
    try {
      const rows = await db.query<{ count: string }>(
        `select count(*)::text as count from public.channel_jobs
          where status = 'pending' and channel = any($1::text[])`,
        [[...CHANNEL]],
      )
      pending = Number(rows[0]?.count ?? 0)
    } catch {
      pending = -1
    }
  }

  return {
    healthy,
    ready,
    degraded,
    draining,
    db: dbOk,
    channel: [...CHANNEL],
    mockMode: env.mockMode,
    role: 'erp',
    worker: env.workerId,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    jobs: { pending },
  }
}

async function processLookupSync(raw: Record<string, unknown>) {
  if (typeof raw.orderId === 'string') {
    const result = await lookupOrder(raw.orderId)
    return { status: (result.ok ? 200 : 502) as 200 | 502, body: result }
  }
  if (typeof raw.sku === 'string') {
    const result = await lookupStock(raw.sku)
    return { status: (result.ok ? 200 : 502) as 200 | 502, body: result }
  }
  return { status: 400 as const, body: { error: 'orderId_or_sku_required' } }
}

export function createApp() {
  return createHttpServer({
    getHealth,
    routes: {
      'POST /lookup': async (_req, res, _url, body) => {
        let raw: Record<string, unknown> = {}
        try {
          raw = body ? (JSON.parse(body) as Record<string, unknown>) : {}
        } catch {
          sendJson(res, 400, { error: 'invalid_json' })
          return
        }

        const db = getDb()
        if (db && hasDatabase) {
          const orderId = typeof raw.orderId === 'string' ? raw.orderId : ''
          const sku = typeof raw.sku === 'string' ? raw.sku : ''
          if (!orderId && !sku) {
            sendJson(res, 400, { error: 'orderId_or_sku_required' })
            return
          }
          const jobId = await enqueueChannelJob(db, {
            orgId: env.orgId,
            channelAccountId: env.accountId,
            channel: (typeof raw.channel === 'string' && raw.channel) || CHANNEL[0],
            type: 'channel.lookup',
            payload: { ...raw, accountId: env.accountId },
          })
          sendJson(res, 202, { ok: true, queued: true, jobId })
          return
        }

        const result = await processLookupSync(raw)
        sendJson(res, result.status, result.body)
      },
    },
  })
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isMain) {
  void initMonitoring().catch(() => undefined)
  const db = initDb()

  const jobLoop =
    db && hasDatabase
      ? createJobLoop({
          query: db.query,
          workerId: env.workerId,
          channel: JOB_CHANNEL,
          pollIntervalMs: env.jobPollIntervalMs,
          batchSize: env.jobBatchSize,
          staleJobSeconds: env.staleJobSeconds,
          handle: (job) => handleChannelJob(job, db),
          logger,
        })
      : undefined

  await runChannelWorker({
    channel: [...CHANNEL],
    workerId: env.workerId,
    createHttpApp: createApp,
    port: env.port,
    getHealth,
    jobLoop,
    drainState,
    startHeartbeat:
      db && jobLoop
        ? () =>
            startHeartbeat({
              query: db.query,
              workerId: env.workerId,
              channel: JOB_CHANNEL,
              intervalMs: env.heartbeatIntervalMs,
              logger,
              getStats: async () => {
                const counts = await accountHealthCounts().catch(() => ({ live: 0, error: 0 }))
                return {
                  tracked: counts.live + counts.error,
                  live: counts.live,
                  dbPoolMax: env.dbPoolMax,
                }
              },
            })
        : undefined,
    stopHeartbeat: db && jobLoop ? stopHeartbeat : undefined,
    onBoot: jobLoop
      ? async () => {
          await db!.pool.query('select 1')
          const requeued = await jobLoop.requeueOwn()
          const stale = await jobLoop.reclaimStale()
          if (requeued > 0 || stale > 0) {
            logger.info({ requeued, stale }, 'Onceki calisma kalintilari temizlendi')
          }
        }
      : undefined,
    shutdownDrainMs: env.shutdownDrainMs,
    logger,
    flushMonitoring,
    captureException,
    onAfterClose: closeDb,
  })
}

export { env, loadErpConfig, drainState }
