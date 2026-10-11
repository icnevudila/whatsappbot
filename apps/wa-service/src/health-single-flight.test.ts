import test from 'node:test'
import assert from 'node:assert/strict'
import { singleFlight } from './health-single-flight.js'

test('50 overlapping probes perform one check, then a fresh check after settling', async () => {
  let calls = 0
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const check = singleFlight(async () => { calls++; await gate; return calls })
  const probes = Array.from({ length: 50 }, () => check())
  await Promise.resolve()
  assert.equal(calls, 1)
  release()
  assert.deepEqual(await Promise.all(probes), Array(50).fill(1))
  assert.equal(await check(), 2)
})

test('a failed shared probe is retried rather than cached as success', async () => {
  let calls = 0
  const check = singleFlight(async () => { calls++; throw new Error('DB_UNAVAILABLE') })
  const results = await Promise.allSettled(Array.from({ length: 30 }, () => check()))
  assert.equal(calls, 1)
  assert.ok(results.every(result => result.status === 'rejected'))
  await assert.rejects(check(), /DB_UNAVAILABLE/)
  assert.equal(calls, 2)
})

for (const concurrency of [5, 10, 20, 30, 50]) {
  test(`concurrency matrix: ${concurrency} overlapping callers share exactly 1 probe execution`, async () => {
    let executions = 0
    let release!: () => void
    const barrier = new Promise<void>(resolve => { release = resolve })
    const runner = singleFlight(async () => {
      executions++
      await barrier
      return { ok: true, executionId: executions, poolConnectionsUsed: 1 }
    })

    const requests = Array.from({ length: concurrency }, () => runner())
    await Promise.resolve()
    assert.equal(executions, 1, `Expected exactly 1 DB execution under ${concurrency} concurrent requests`)
    release()

    const responses = await Promise.all(requests)
    assert.equal(responses.length, concurrency)
    for (const res of responses) {
      assert.equal(res.executionId, 1)
      assert.equal(res.poolConnectionsUsed, 1)
    }

    // After settling, a new request executes independently
    const next = await runner()
    assert.equal(next.executionId, 2)
    assert.equal(executions, 2)
  })
}

test('timeout or slow execution rejects correctly without sticking as permanent result', async () => {
  let callCount = 0
  const slowCheck = singleFlight(async () => {
    callCount++
    if (callCount === 1) {
      throw new Error('PROBE_TIMEOUT_8000MS')
    }
    return { ok: true, recovered: true }
  })

  await assert.rejects(slowCheck(), /PROBE_TIMEOUT_8000MS/)
  const recovered = await slowCheck()
  assert.deepEqual(recovered, { ok: true, recovered: true })
  assert.equal(callCount, 2)
})
