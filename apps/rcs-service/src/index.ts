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
import { parseInbound, sendMessage } from './adapter.js'
import { accountHealthCounts } from './accounts.js'
import { closeDb, getDb, initDb, pingDb } from './db.js'
import { CHANNEL, env, hasDatabase, loadRcsConfig } from './env.js'
import { enqueueChannelJob, handleChannelJob } from './job-handlers.js'

const logger = createWorkerLogger('rcs-service', env.workerId)
const drainState = createDrainState()
const startedAt = Date.now()

export type RcsHealth = HealthSnapshot & {
  degraded?: boolean
  draining?: boolean
  db?: boolean
  worker?: string
  jobs?: { pending: number }
}

export async function getHealth(): Promise<RcsHealth> {
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
          where status = 'pending' and channel = 'rcs'`,
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
    channel: CHANNEL,
    mockMode: env.mockMode,
    role: 'messaging',
    worker: env.workerId,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    jobs: { pending },
  }
}

async function processWebhookSync(raw: unknown) {
  const event = parseInbound(raw)
  if (!event) return { ok: false as const, error: 'invalid_event' }
  const db = getDb()
  if (db) {
    const { createPgPersistClient } = await import('./job-handlers.js')
    const { persistChannelEvent } = await import('@wa/channel-runtime')
    await persistChannelEvent(createPgPersistClient(db), event, env.accountId)
  }
  return { ok: true as const, event }
}

async function processSendSync(raw: Record<string, unknown>) {
  const text = typeof raw.text === 'string' ? raw.text : ''
  const threadId = String(raw.threadId ?? '')
  if (!text || !threadId) {
    return { status: 400 as const, body: { error: 'text_and_threadId_required' } }
  }
  const result = await sendMessage({
    orgId: env.orgId,
    accountId: env.accountId,
    channel: CHANNEL,
    threadId,
    text,
  })
  return { status: (result.ok ? 200 : 502) as 200 | 502, body: result }
}

export function createApp() {
  return createHttpServer({
    getHealth,
    routes: {
      'POST /webhook': async (_req, res, _url, body) => {
        let raw: unknown = {}
        try {
          raw = body ? JSON.parse(body) : {}
        } catch {
          sendJson(res, 400, { error: 'invalid_json' })
          return
        }

        const db = getDb()
        if (db && hasDatabase) {
          const jobId = await enqueueChannelJob(db, {
            orgId: env.orgId,
            channelAccountId: env.accountId,
            channel: CHANNEL,
            type: 'channel.webhook.process',
            payload: { raw, accountId: env.accountId },
          })
          sendJson(res, 202, { ok: true, queued: true, jobId })
          return
        }

        const result = await processWebhookSync(raw)
        if (!result.ok) {
          sendJson(res, 400, { error: result.error })
          return
        }
        sendJson(res, 200, { ok: true, event: result.event })
      },
      'POST /send': async (_req, res, _url, body) => {
        let raw: Record<string, unknown> = {}
        try {
          raw = body ? (JSON.parse(body) as Record<string, unknown>) : {}
        } catch {
          sendJson(res, 400, { error: 'invalid_json' })
          return
        }

        const db = getDb()
        if (db && hasDatabase) {
          const text = typeof raw.text === 'string' ? raw.text : ''
          const threadId = String(raw.threadId ?? '')
          if (!text || !threadId) {
            sendJson(res, 400, { error: 'text_and_threadId_required' })
            return
          }
          const jobId = await enqueueChannelJob(db, {
            orgId: env.orgId,
            channelAccountId: env.accountId,
            channel: CHANNEL,
            type: 'channel.send',
            payload: { ...raw, threadId, text, accountId: env.accountId },
          })
          sendJson(res, 202, { ok: true, queued: true, jobId })
          return
        }

        const result = await processSendSync(raw)
        sendJson(res, result.status, result.body)
      },
      'GET /webhook': async (_req, res, url) => {
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')
        if (mode === 'subscribe' && token === env.verifyToken && challenge) {
          res.writeHead(200, { 'content-type': 'text/plain' })
          res.end(challenge)
          return
        }
        sendJson(res, 403, { error: 'verify_failed' })
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
          channel: CHANNEL,
          pollIntervalMs: env.jobPollIntervalMs,
          batchSize: env.jobBatchSize,
          staleJobSeconds: env.staleJobSeconds,
          handle: (job) => handleChannelJob(job, db),
          logger,
        })
      : undefined

  await runChannelWorker({
    channel: CHANNEL,
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
              channel: CHANNEL,
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

export { env, loadRcsConfig, drainState }
