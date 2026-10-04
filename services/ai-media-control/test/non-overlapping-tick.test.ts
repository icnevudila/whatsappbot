import test from 'node:test'
import assert from 'node:assert/strict'
import { createNonOverlappingTick } from '../src/non-overlapping-tick.js'

test('twenty overlapping ticks execute one task; next tick runs after release', async () => {
  let count = 0
  let release!: () => void
  const barrier = new Promise<void>(resolve => { release = resolve })
  const tick = createNonOverlappingTick(async () => { count++; await barrier }, error => { throw error })
  const first = tick()
  await Promise.all(Array.from({ length: 20 }, () => tick()))
  assert.equal(count, 1)
  release()
  await first
  await tick()
  assert.equal(count, 2)
})

test('failure reports once and releases ownership for a later tick', async () => {
  let count = 0
  const errors: unknown[] = []
  const tick = createNonOverlappingTick(async () => { count++; throw new Error('fixture') }, error => errors.push(error))
  await tick()
  await tick()
  assert.equal(count, 2)
  assert.equal(errors.length, 2)
})
