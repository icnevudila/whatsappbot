import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeChannelReady } from './health.js'

test('computeChannelReady matrix', () => {
  assert.deepEqual(
    computeChannelReady({ dbOk: true, draining: false, liveAccounts: 2, errorAccounts: 0 }),
    { healthy: true, ready: true, degraded: false },
  )

  assert.deepEqual(
    computeChannelReady({ dbOk: true, draining: false, liveAccounts: 0, errorAccounts: 0 }),
    { healthy: true, ready: true, degraded: false },
  )

  assert.deepEqual(
    computeChannelReady({ dbOk: true, draining: false, liveAccounts: 1, errorAccounts: 2 }),
    { healthy: true, ready: true, degraded: true },
  )

  assert.deepEqual(
    computeChannelReady({ dbOk: true, draining: false, liveAccounts: 0, errorAccounts: 3 }),
    { healthy: true, ready: false, degraded: true },
  )

  assert.deepEqual(
    computeChannelReady({ dbOk: false, draining: false, liveAccounts: 5, errorAccounts: 0 }),
    { healthy: false, ready: false, degraded: false },
  )

  assert.deepEqual(
    computeChannelReady({ dbOk: true, draining: true, liveAccounts: 5, errorAccounts: 0 }),
    { healthy: true, ready: false, degraded: false },
  )

  assert.deepEqual(
    computeChannelReady({ dbOk: false, draining: true, liveAccounts: 0, errorAccounts: 1 }),
    { healthy: true, ready: false, degraded: false },
  )
})
