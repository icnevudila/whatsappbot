import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ideasoftOrderPath, lookupOrder, lookupStock } from './adapter.js'

test('ideasoft paths + mock', async () => {
  assert.equal(ideasoftOrderPath('3'), '/admin-api/orders/3')
  assert.equal((await lookupOrder('3')).ok, true)
  assert.equal((await lookupStock('S')).data?.stock, 4)
})
