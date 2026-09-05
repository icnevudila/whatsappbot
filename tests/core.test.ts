import test from 'node:test'
import assert from 'node:assert/strict'
import { warmupCap } from '../packages/shared/src/capacity'
import { safeInternalPath } from '../apps/panel/src/lib/auth-redirect'
import { awaitDelivery, DeliveryUncertainError } from '../apps/wa-service/src/delivery'

test('warmup policy handles boundaries, missing, invalid and future dates conservatively', () => {
  const now = Date.parse('2026-09-05T12:00:00Z')
  for (const [days, expected] of [[0, 10], [1, 25], [2, 25], [3, 60], [6, 60], [7, 120], [13, 120], [14, 250]]) {
    assert.equal(warmupCap(new Date(now - days * 86400000).toISOString(), now), expected)
  }
  assert.equal(warmupCap(null, now), 10)
  assert.equal(warmupCap('not-a-date', now), 10)
  assert.equal(warmupCap(new Date(now + 86400000).toISOString(), now), 10)
})

test('authentication redirects reject external and ambiguous paths', () => {
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/\nevil.example', '/%2f%2fevil.example', '/giris', '/auth/callback']) assert.equal(safeInternalPath(value), '/ozet', value)
  assert.equal(safeInternalPath('/gelenler?tel=%2B905321234567'), '/gelenler?tel=%2B905321234567')
  assert.equal(safeInternalPath('/sifre-yenile'), '/sifre-yenile')
})

test('successful delivery returns the original receipt', async () => {
  const message = { key: { id: 'receipt-1' } }
  assert.equal(await awaitDelivery(Promise.resolve(message), 1000), message)
})

test('delivery timeout cannot turn a late success into an automatic retry', async () => {
  let calls = 0
  let finish!: (value: { id: string }) => void
  const request = new Promise<{ id: string }>(resolve => { calls += 1; finish = resolve })
  await assert.rejects(awaitDelivery(request, 10), DeliveryUncertainError)
  finish({ id: 'late-receipt' })
  await request
  assert.equal(calls, 1)
})

test('lost receipts and network failures are uncertain, explicit account locks remain recognizable', async () => {
  await assert.rejects(awaitDelivery(Promise.resolve(undefined), 100), DeliveryUncertainError)
  await assert.rejects(awaitDelivery(Promise.reject(new Error('socket closed')), 100), DeliveryUncertainError)
  const locked = Object.assign(new Error('restricted'), { output: { statusCode: 463 } })
  await assert.rejects(awaitDelivery(Promise.reject(locked), 100), error => error === locked)
})
