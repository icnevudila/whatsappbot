import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lookupOrder, lookupStock, tsoftOrderPath } from './adapter.js'

test('tsoft paths + mock', async () => {
  assert.match(tsoftOrderPath('99'), /OrderId=99/)
  assert.equal((await lookupOrder('99')).ok, true)
  assert.equal((await lookupStock('SKU')).data?.Stok, 22)
})
