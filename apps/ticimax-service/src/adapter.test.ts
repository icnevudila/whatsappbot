import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lookupOrder, lookupStock, ticimaxOrderPath } from './adapter.js'

test('ticimax paths + mock', async () => {
  assert.equal(ticimaxOrderPath('7'), '/api/siparis/7')
  assert.equal((await lookupOrder('7')).data?.Durumu, 'Onaylandi')
  assert.equal((await lookupStock('X')).data?.StokAdedi, 9)
})
