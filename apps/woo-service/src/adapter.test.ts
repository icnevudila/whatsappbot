import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lookupOrder, lookupStock, parseWooAuthHeader } from './adapter.js'

test('woo auth header', () => {
  assert.match(parseWooAuthHeader('ck:cs'), /^Basic /)
  assert.equal(parseWooAuthHeader('plain-token'), 'Bearer plain-token')
})

test('woo mock order stock', async () => {
  const order = await lookupOrder('55')
  assert.equal(order.ok, true)
  assert.equal(order.data?.billing && (order.data.billing as { email: string }).email, 'musteri@ornek.com')
  assert.equal((await lookupStock('SKU')).ok, true)
})
