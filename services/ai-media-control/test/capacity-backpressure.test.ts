import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForHeavyCapacity, deferCapacityJob, claimCapacityPreparation } from '../src/capacity-backpressure.js'
import { leaseJob } from '../src/queue.js'

test('busy capacity waits then acquires without retrying generation', async () => {
  let time = 0; let calls = 0
  const result = await waitForHeavyCapacity({ acquire: async () => ++calls === 3,
    stillOwnLease: async () => true, now: () => time, sleep: async ms => { time += ms }, maxWaitMs: 20, pollMs: 5 })
  assert.equal(result, 'acquired'); assert.equal(calls, 3); assert.equal(time, 10)
})

test('persistent contention returns deferred within bounded deadline, not an execution failure', async () => {
  let time = 0
  const result = await waitForHeavyCapacity({ acquire: async () => false, stillOwnLease: async () => true,
    now: () => time, sleep: async ms => { time += ms }, maxWaitMs: 20, pollMs: 7 })
  assert.equal(result, 'deferred'); assert.equal(time, 20)
})

test('lost or cancelled lease never acquires capacity', async () => {
  let acquired = 0
  assert.equal(await waitForHeavyCapacity({ acquire: async () => { acquired++; return true },
    stillOwnLease: async () => false }), 'lease_lost')
  assert.equal(acquired, 0)
})

function mockDb(rows: any[], error: any = null) {
  const operations: any[] = []
  const db = { from(table: string) {
    const operation: any = { table, filters: [] }; operations.push(operation)
    const chain: any = {
      update(value: any) { operation.update = value; return chain },
      eq(field: string, value: any) { operation.filters.push([field, value]); return chain },
      select() { return Promise.resolve({ data: rows, error }) },
      insert(value: any) { operation.insert = value; return Promise.resolve({ error: null }) },
    }; return chain
  } }
  return { db, operations }
}

test('defer requeues only owned pre-provider lease with tenant CAS and audit', async () => {
  const { db, operations } = mockDb([{ id: 'job' }])
  assert.equal(await deferCapacityJob(db, { id: 'job', org_id: 'org' }, 'account'), true)
  assert.equal(operations[0].update.state, 'QUEUED')
  assert.deepEqual(operations[0].filters, [['id','job'], ['org_id','org'], ['state','LEASED'], ['lease_account_id','account']])
  assert.equal(operations[1].insert.payload.provider_submitted, false)
})

test('defer cannot overwrite generating/completed/other-account jobs after CAS loss', async () => {
  const { db, operations } = mockDb([])
  assert.equal(await deferCapacityJob(db, { id: 'job', org_id: 'org' }, 'account'), false)
  assert.equal(operations.length, 1)
})

test('lease claim requires matched row, not merely absence of DB error', async () => {
  assert.equal(await leaseJob(mockDb([]).db as any, 'job', 'worker', 'account'), false)
  assert.equal(await leaseJob(mockDb([{ id: 'job' }]).db as any, 'job', 'worker', 'account'), true)
})

test('a hung ownership check is bounded by the operation timeout and never calls provider capacity', async () => {
  let acquired = 0
  await assert.rejects(waitForHeavyCapacity({ stillOwnLease: () => new Promise(() => {}),
    acquire: async () => { acquired++; return true }, maxWaitMs: 50, operationTimeoutMs: 10 }), /CAPACITY_OPERATION_TIMEOUT/)
  assert.equal(acquired, 0)
})

test('a late capacity acquisition is released after timeout and cannot resume generation', async () => {
  let released = 0
  await assert.rejects(waitForHeavyCapacity({ stillOwnLease: async () => true,
    acquire: () => new Promise(resolve => setTimeout(() => resolve(true), 25)),
    releaseLateAcquisition: async () => { released++ }, maxWaitMs: 100, operationTimeoutMs: 5 }), /CAPACITY_OPERATION_TIMEOUT/)
  await new Promise(resolve => setTimeout(resolve, 35))
  assert.equal(released, 1)
})

test('defer DB failure leaves authoritative job untouched and emits no false capacity receipt', async () => {
  const { db, operations } = mockDb([], { message: 'unavailable' })
  await assert.rejects(deferCapacityJob(db, { id: 'job', org_id: 'org' }, 'account'), /CAPACITY_REQUEUE_DB_ERROR/)
  assert.equal(operations.length, 1)
})

test('preparation CAS rejects an ownership change during capacity acquisition without a fallback', async () => {
  const { db, operations } = mockDb([])
  assert.equal(await claimCapacityPreparation(db, { id: 'job', org_id: 'org' }, 'account', 'attempt'), false)
  assert.equal(operations.length, 1)
  assert.equal(operations[0].update.state, 'PREPARING_ENV')
  assert.deepEqual(operations[0].filters, [['id','job'], ['org_id','org'], ['state','LEASED'], ['lease_account_id','account']])
})

test('preparation commits only an owned matched lease and records the pre-provider boundary', async () => {
  const { db, operations } = mockDb([{ id: 'job' }])
  assert.equal(await claimCapacityPreparation(db, { id: 'job', org_id: 'org' }, 'account', 'attempt'), true)
  assert.equal(operations[1].insert.to_state, 'PREPARING_ENV')
  assert.equal(operations[1].insert.payload.provider_submitted, false)
})
