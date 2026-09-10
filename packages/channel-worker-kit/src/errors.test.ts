import assert from 'node:assert/strict'
import { test } from 'node:test'
import { awaitDelivery, DeliveryUncertainError } from './errors.js'

test('awaitDelivery timeout → DeliveryUncertainError', async () => {
  await assert.rejects(
    () =>
      awaitDelivery(
        new Promise((resolve) => {
          setTimeout(() => resolve('late'), 200)
        }),
        30,
      ),
    (err: unknown) => err instanceof DeliveryUncertainError,
  )
})

test('awaitDelivery success', async () => {
  const value = await awaitDelivery(Promise.resolve({ ok: true }), 1000)
  assert.deepEqual(value, { ok: true })
})

test('awaitDelivery null result → DeliveryUncertainError', async () => {
  await assert.rejects(
    () => awaitDelivery(Promise.resolve(null), 1000),
    (err: unknown) => err instanceof DeliveryUncertainError,
  )
})
