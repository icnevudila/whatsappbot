import { DeliveryUncertainError, NonRetryableJobError } from './errors.js'
import type { WorkerLogger } from './logger.js'

export type ChannelJobRow = {
  id: string
  org_id: string | null
  channel_account_id: string | null
  channel: string
  type: string
  payload: Record<string, unknown>
  attempts: number
  max_attempts: number
}

export type JobHandler = (job: ChannelJobRow) => Promise<unknown>

type QueryFn = <T>(sql: string, params?: unknown[]) => Promise<T[]>

function normalizeJob(row: Record<string, unknown>): ChannelJobRow {
  const payload = row.payload
  return {
    id: String(row.id),
    org_id: row.org_id != null ? String(row.org_id) : null,
    channel_account_id: row.channel_account_id != null ? String(row.channel_account_id) : null,
    channel: String(row.channel),
    type: String(row.type),
    payload:
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {},
    attempts: Number(row.attempts ?? 0),
    max_attempts: Number(row.max_attempts ?? 3),
  }
}

export function createJobLoop(opts: {
  query: QueryFn
  workerId: string
  channel: string
  pollIntervalMs: number
  batchSize: number
  staleJobSeconds: number
  handle: JobHandler
  logger: WorkerLogger
}) {
  const log = opts.logger.child({ scope: 'jobs' })
  let running = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let tickActive = false
  let inFlightJobs = 0

  async function markDone(jobId: string, result: unknown): Promise<boolean> {
    const rows = await opts.query<{ id: string }>(
      `update public.channel_jobs
          set status = 'done', result = $2::jsonb, error = null, finished_at = now(), updated_at = now()
        where id = $1::bigint
          and claimed_by = $3
          and status in ('claimed', 'running')
        returning id::text`,
      [jobId, JSON.stringify(result ?? {}), opts.workerId],
    )
    if (rows.length === 0) {
      log.warn({ jobId }, 'markDone atlandi: sahiplik kaybedildi')
      return false
    }
    return true
  }

  async function markFailed(job: ChannelJobRow, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error)
    const nonRetryable =
      error instanceof NonRetryableJobError || error instanceof DeliveryUncertainError
    const canRetry = !nonRetryable && job.attempts < job.max_attempts

    if (canRetry) {
      const delaySeconds = Math.min(300, 5 * 2 ** job.attempts)
      const rows = await opts.query<{ id: string }>(
        `update public.channel_jobs
            set status = 'pending',
                error = $2,
                run_after = now() + make_interval(secs => $3),
                claimed_by = null,
                claimed_at = null,
                updated_at = now()
          where id = $1::bigint
            and claimed_by = $4
            and status in ('claimed', 'running')
          returning id::text`,
        [job.id, message, delaySeconds, opts.workerId],
      )
      if (rows.length === 0) {
        log.warn({ jobId: job.id }, 'markFailed(retry) atlandi: sahiplik kaybedildi')
        return
      }
      log.warn({ jobId: job.id, type: job.type, delaySeconds }, 'Is yeniden kuyruga alindi')
      return
    }

    const rows = await opts.query<{ id: string }>(
      `update public.channel_jobs
          set status = 'failed',
              error = $2,
              finished_at = now(),
              claimed_by = null,
              claimed_at = null,
              updated_at = now()
        where id = $1::bigint
          and claimed_by = $3
          and status in ('claimed', 'running')
        returning id::text`,
      [job.id, message, opts.workerId],
    )
    if (rows.length === 0) {
      log.warn({ jobId: job.id }, 'markFailed(final) atlandi: sahiplik kaybedildi')
      return
    }
    log.error({ jobId: job.id, type: job.type, err: message }, 'Is kalici olarak basarisiz')
  }

  async function tick(): Promise<void> {
    tickActive = true
    try {
      const claimed = await opts.query<Record<string, unknown>>(
        'select * from public.claim_channel_jobs($1, $2, $3)',
        [opts.workerId, opts.channel, opts.batchSize],
      )
      if (claimed.length === 0) return

      const jobs = claimed.map(normalizeJob)
      log.info({ count: jobs.length, type: jobs[0]?.type }, 'Is alindi')

      for (const job of jobs) {
        inFlightJobs += 1
        const heartbeat = setInterval(() => {
          void opts
            .query(
              `update public.channel_jobs
                  set claimed_at = now(), updated_at = now()
                where id = $1::bigint
                  and claimed_by = $2
                  and status = 'running'`,
              [job.id, opts.workerId],
            )
            .catch((err) => {
              log.warn({ err, jobId: job.id }, 'Job heartbeat basarisiz')
            })
        }, 45_000)

        try {
          const runningRows = await opts.query<{ id: string }>(
            `update public.channel_jobs
                set status = 'running', claimed_at = now(), updated_at = now()
              where id = $1::bigint
                and claimed_by = $2
                and status = 'claimed'
              returning id::text`,
            [job.id, opts.workerId],
          )
          if (runningRows.length === 0) {
            log.warn({ jobId: job.id }, 'running gecisi atlandi: sahiplik kaybedildi')
            continue
          }

          const result = await opts.handle(job)
          try {
            await markDone(job.id, result)
          } catch (error) {
            if (job.type === 'channel.send') {
              throw new NonRetryableJobError(
                'Gönderim işlendi fakat sonuç kaydedilemedi. Otomatik tekrar yapılmadı.',
              )
            }
            throw error
          }
        } catch (error) {
          await markFailed(job, error)
        } finally {
          clearInterval(heartbeat)
          inFlightJobs -= 1
        }
      }
    } finally {
      tickActive = false
    }
  }

  function start(): void {
    if (running) return
    running = true

    const loop = async (): Promise<void> => {
      if (!running) return
      try {
        await tick()
      } catch (error) {
        log.error({ err: error }, 'Is kuyrugu dongusunde hata')
      }
      if (running) {
        timer = setTimeout(() => void loop(), opts.pollIntervalMs)
      }
    }

    void loop()
    log.info({ intervalMs: opts.pollIntervalMs }, 'Is kuyrugu tuketicisi basladi')
  }

  function stop(): void {
    running = false
    if (timer) clearTimeout(timer)
    timer = undefined
  }

  async function drain(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while ((tickActive || inFlightJobs > 0) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    if (tickActive || inFlightJobs > 0) {
      log.warn({ inFlightJobs, tickActive }, 'Job drain zaman asimina ugradi')
    }
  }

  async function reclaimStale(): Promise<number> {
    const rows = await opts.query<{ n: number | string }>(
      'select public.reclaim_stale_channel_jobs($1)::int as n',
      [opts.staleJobSeconds],
    )
    return Number(rows[0]?.n ?? 0)
  }

  async function requeueOwn(): Promise<number> {
    const rows = await opts.query<{ id: string }>(
      `update public.channel_jobs
          set status = 'pending', claimed_by = null, claimed_at = null, updated_at = now()
        where claimed_by = $1
          and status in ('claimed', 'running')
        returning id::text`,
      [opts.workerId],
    )
    return rows.length
  }

  async function pendingCount(): Promise<number> {
    const rows = await opts.query<{ count: string }>(
      `select count(*)::text as count
         from public.channel_jobs
        where status = 'pending'
          and ($1 = '*' or channel = $1)`,
      [opts.channel],
    )
    return Number(rows[0]?.count ?? 0)
  }

  return {
    start,
    stop,
    drain,
    reclaimStale,
    requeueOwn,
    pendingCount,
    /** test / metrics */
    inFlightCount: () => inFlightJobs,
  }
}

export type JobLoop = ReturnType<typeof createJobLoop>
