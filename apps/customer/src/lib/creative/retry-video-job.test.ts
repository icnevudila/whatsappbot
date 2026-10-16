import test from 'node:test'
import assert from 'node:assert/strict'
import { retryVideoJob } from './retry-video-job'

function database(job: any, updated: any = { id: 'job' }) {
  const calls: any[] = []
  let updating = false
  const query: any = {
    select: (...args: any[]) => { calls.push(['select', ...args]); return query },
    eq: (...args: any[]) => { calls.push(['eq', ...args]); return query },
    update: (value: any) => { updating = true; calls.push(['update', value]); return query },
    maybeSingle: async () => ({ data: updating ? updated : job, error: null }),
  }
  return { calls, from: () => query }
}
test('video retry queues the tenant-scoped orchestrator job once with compare-and-set', async () => {
  const db = database({ state: 'FAILED', retry_count: 0, max_retries: 2 })
  assert.equal(await retryVideoJob(db, 'tenant', 'job'), null)
  assert.equal(db.calls.find(c => c[0] === 'update')[1].state, 'QUEUED')
  assert.equal(db.calls.find(c => c[0] === 'update')[1].retry_count, 1)
  assert.equal(db.calls.filter(c => c[0] === 'eq' && c[1] === 'org_id' && c[2] === 'tenant').length, 2)
  assert.ok(db.calls.some(c => c[0] === 'eq' && c[1] === 'retry_count' && c[2] === 0))
})
test('active, exhausted, missing and concurrently changed jobs never report retry success', async () => {
  for (const job of [null, { state: 'GENERATING', retry_count: 0, max_retries: 2 }, { state: 'FAILED', retry_count: 2, max_retries: 2 }]) {
    const db = database(job)
    assert.ok(await retryVideoJob(db, 'tenant', 'job'))
    assert.equal(db.calls.filter(c => c[0] === 'update').length, 0)
  }
  assert.ok(await retryVideoJob(database({ state: 'FAILED', retry_count: 0, max_retries: 2 }, null), 'tenant', 'job'))
})
