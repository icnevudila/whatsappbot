import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createJobLoop, type ChannelJobRow } from './jobs.js'
import { DeliveryUncertainError, NonRetryableJobError } from './errors.js'
import { createWorkerLogger } from './logger.js'

type JobRecord = ChannelJobRow & {
  status: string
  claimed_by: string | null
  claimed_at: string | null
  run_after: number
  error: string | null
  result: unknown
  finished_at: string | null
}

function createFakeDb(workerId: string) {
  const jobs = new Map<string, JobRecord>()
  let seq = 1

  function enqueue(partial: Partial<JobRecord> & Pick<JobRecord, 'type' | 'channel'>): string {
    const id = String(seq++)
    jobs.set(id, {
      id,
      org_id: partial.org_id ?? 'org-1',
      channel_account_id: partial.channel_account_id ?? 'acc-1',
      channel: partial.channel,
      type: partial.type,
      payload: partial.payload ?? {},
      attempts: partial.attempts ?? 0,
      max_attempts: partial.max_attempts ?? 3,
      status: 'pending',
      claimed_by: null,
      claimed_at: null,
      run_after: Date.now(),
      error: null,
      result: null,
      finished_at: null,
    })
    return id
  }

  const query = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
    const text = sql.replace(/\s+/g, ' ').trim().toLowerCase()

    if (text.includes('claim_channel_jobs')) {
      const [wId, channel, limit] = params as [string, string, number]
      const claimed: JobRecord[] = []
      for (const job of jobs.values()) {
        if (claimed.length >= limit) break
        if (job.status !== 'pending') continue
        if (channel !== '*' && job.channel !== channel) continue
        if (job.run_after > Date.now()) continue
        job.status = 'claimed'
        job.claimed_by = wId
        job.claimed_at = new Date().toISOString()
        job.attempts += 1
        claimed.push({ ...job })
      }
      return claimed as T[]
    }

    if (text.includes("set status = 'running'")) {
      const [id, wId] = params as [string, string]
      const job = jobs.get(String(id))
      if (!job || job.claimed_by !== wId || job.status !== 'claimed') return []
      job.status = 'running'
      job.claimed_at = new Date().toISOString()
      return [{ id: job.id } as T]
    }

    if (text.includes("set status = 'done'")) {
      const [id, _resultJson, wId] = params as [string, string, string]
      const job = jobs.get(String(id))
      if (!job || job.claimed_by !== wId || !['claimed', 'running'].includes(job.status)) return []
      job.status = 'done'
      job.result = JSON.parse(_resultJson)
      job.finished_at = new Date().toISOString()
      job.error = null
      return [{ id: job.id } as T]
    }

    if (text.includes("set status = 'pending'") && text.includes('run_after')) {
      const [id, message, delaySeconds, wId] = params as [string, string, number, string]
      const job = jobs.get(String(id))
      if (!job || job.claimed_by !== wId || !['claimed', 'running'].includes(job.status)) return []
      job.status = 'pending'
      job.error = message
      job.run_after = Date.now() + delaySeconds * 1000
      job.claimed_by = null
      job.claimed_at = null
      return [{ id: job.id } as T]
    }

    if (text.includes("set status = 'failed'")) {
      const [id, message, wId] = params as [string, string, string]
      const job = jobs.get(String(id))
      if (!job || job.claimed_by !== wId || !['claimed', 'running'].includes(job.status)) return []
      job.status = 'failed'
      job.error = message
      job.finished_at = new Date().toISOString()
      job.claimed_by = null
      job.claimed_at = null
      return [{ id: job.id } as T]
    }

    if (text.includes('claimed_at = now()') && text.includes("status = 'running'")) {
      const [id, wId] = params as [string, string]
      const job = jobs.get(String(id))
      if (!job || job.claimed_by !== wId || job.status !== 'running') return []
      job.claimed_at = new Date().toISOString()
      return [] as T[]
    }

    if (text.includes('reclaim_stale_channel_jobs')) {
      return [{ n: 0 } as T]
    }

    if (text.includes('claimed_by = $1') && text.includes("status = 'pending'")) {
      const [wId] = params as [string]
      const out: { id: string }[] = []
      for (const job of jobs.values()) {
        if (job.claimed_by === wId && ['claimed', 'running'].includes(job.status)) {
          job.status = 'pending'
          job.claimed_by = null
          job.claimed_at = null
          out.push({ id: job.id })
        }
      }
      return out as T[]
    }

    if (text.includes('count(*)')) {
      const [channel] = params as [string]
      let n = 0
      for (const job of jobs.values()) {
        if (job.status === 'pending' && (channel === '*' || job.channel === channel)) n += 1
      }
      return [{ count: String(n) } as T]
    }

    throw new Error(`Unhandled fake SQL: ${sql}`)
  }

  return { jobs, enqueue, query, workerId }
}

const logger = createWorkerLogger('jobs-test', 'test-worker')

test('job loop claim → done with ownership', async () => {
  const fake = createFakeDb('w1')
  const id = fake.enqueue({ type: 'channel.send', channel: 'telegram', payload: { text: 'hi' } })

  let handled = 0
  const loop = createJobLoop({
    query: fake.query,
    workerId: 'w1',
    channel: 'telegram',
    pollIntervalMs: 10_000,
    batchSize: 5,
    staleJobSeconds: 900,
    handle: async (job) => {
      handled += 1
      assert.equal(job.id, id)
      return { sent: true }
    },
    logger,
  })

  // Internal tick via start+immediate: call reclaim/pending and drive one cycle
  // by temporarily using start/stop with short poll — instead invoke via pending + private path.
  // createJobLoop doesn't export tick; start a loop and wait briefly.
  loop.start()
  await new Promise((r) => setTimeout(r, 50))
  loop.stop()
  await loop.drain(1000)

  assert.equal(handled, 1)
  assert.equal(fake.jobs.get(id)?.status, 'done')
  assert.deepEqual(fake.jobs.get(id)?.result, { sent: true })
})

test('job loop retry on regular error', async () => {
  const fake = createFakeDb('w1')
  const id = fake.enqueue({
    type: 'channel.webhook.process',
    channel: 'telegram',
    max_attempts: 3,
  })

  const loop = createJobLoop({
    query: fake.query,
    workerId: 'w1',
    channel: 'telegram',
    pollIntervalMs: 10_000,
    batchSize: 5,
    staleJobSeconds: 900,
    handle: async () => {
      throw new Error('transient')
    },
    logger,
  })

  loop.start()
  await new Promise((r) => setTimeout(r, 50))
  loop.stop()
  await loop.drain(1000)

  const job = fake.jobs.get(id)!
  assert.equal(job.status, 'pending')
  assert.equal(job.attempts, 1)
  assert.match(job.error ?? '', /transient/)
  assert.equal(job.claimed_by, null)
})

test('NonRetryableJobError → failed without retry', async () => {
  const fake = createFakeDb('w1')
  const id = fake.enqueue({ type: 'channel.send', channel: 'telegram', max_attempts: 5 })

  const loop = createJobLoop({
    query: fake.query,
    workerId: 'w1',
    channel: 'telegram',
    pollIntervalMs: 10_000,
    batchSize: 5,
    staleJobSeconds: 900,
    handle: async () => {
      throw new NonRetryableJobError('kalici')
    },
    logger,
  })

  loop.start()
  await new Promise((r) => setTimeout(r, 50))
  loop.stop()
  await loop.drain(1000)

  assert.equal(fake.jobs.get(id)?.status, 'failed')
  assert.match(fake.jobs.get(id)?.error ?? '', /kalici/)
})

test('DeliveryUncertainError → failed without retry', async () => {
  const fake = createFakeDb('w1')
  const id = fake.enqueue({ type: 'channel.send', channel: 'telegram' })

  const loop = createJobLoop({
    query: fake.query,
    workerId: 'w1',
    channel: 'telegram',
    pollIntervalMs: 10_000,
    batchSize: 5,
    staleJobSeconds: 900,
    handle: async () => {
      throw new DeliveryUncertainError()
    },
    logger,
  })

  loop.start()
  await new Promise((r) => setTimeout(r, 50))
  loop.stop()
  await loop.drain(1000)

  assert.equal(fake.jobs.get(id)?.status, 'failed')
})

test('ownership lost on markDone is skipped', async () => {
  const fake = createFakeDb('w1')
  const id = fake.enqueue({ type: 'channel.sync', channel: 'telegram' })

  const loop = createJobLoop({
    query: fake.query,
    workerId: 'w1',
    channel: 'telegram',
    pollIntervalMs: 10_000,
    batchSize: 5,
    staleJobSeconds: 900,
    handle: async () => {
      // Steal ownership mid-flight
      const job = fake.jobs.get(id)!
      job.claimed_by = 'other-worker'
      return { ok: true }
    },
    logger,
  })

  loop.start()
  await new Promise((r) => setTimeout(r, 50))
  loop.stop()
  await loop.drain(1000)

  // markDone returns false; status stays running under other owner
  assert.equal(fake.jobs.get(id)?.status, 'running')
  assert.equal(fake.jobs.get(id)?.claimed_by, 'other-worker')
})

test('requeueOwn restores claimed jobs', async () => {
  const fake = createFakeDb('w1')
  const id = fake.enqueue({ type: 'channel.send', channel: 'telegram' })
  const job = fake.jobs.get(id)!
  job.status = 'running'
  job.claimed_by = 'w1'

  const loop = createJobLoop({
    query: fake.query,
    workerId: 'w1',
    channel: 'telegram',
    pollIntervalMs: 10_000,
    batchSize: 5,
    staleJobSeconds: 900,
    handle: async () => ({}),
    logger,
  })

  const n = await loop.requeueOwn()
  assert.equal(n, 1)
  assert.equal(fake.jobs.get(id)?.status, 'pending')
  assert.equal(fake.jobs.get(id)?.claimed_by, null)
})
