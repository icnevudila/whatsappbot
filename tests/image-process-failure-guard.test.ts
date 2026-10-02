import test from 'node:test'
import assert from 'node:assert/strict'
import { processCreativeGeneration } from '../apps/customer/src/lib/creative/process'

test('internal processor cannot turn a failed legacy job into a new paid request', async () => {
  let writes = 0
  let requests = 0
  const originalFetch = global.fetch
  global.fetch = async () => { requests++; throw new Error('No request authorized') }
  const db = { from(table: string) {
    assert.equal(table, 'creatives')
    const chain = { select: () => chain, eq: () => chain,
      update: () => { writes++; throw new Error('Unexpected claim') },
      maybeSingle: async () => ({ data: { id: 'legacy', org_id: 'org', status: 'failed',
        format: 'square', error: 'operation aborted timeout', payload: { brief: 'product', aspect: '1:1' } } }),
    }
    return chain
  } }
  try {
    const result = await processCreativeGeneration('legacy', db as any)
    assert.equal(result.ok, false)
    assert.equal(result.error, 'operation aborted timeout')
    assert.equal(writes, 0)
    assert.equal(requests, 0)
  } finally { global.fetch = originalFetch }
})
