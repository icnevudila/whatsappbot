import assert from 'node:assert/strict'
import { test } from 'node:test'
import { expandSpintax, pickAbVariant } from './spintax.ts'

test('expandSpintax picks option', () => {
  const out = expandSpintax('{A|B}', () => 0)
  assert.equal(out, 'A')
  const out2 = expandSpintax('{A|B}', () => 0.99)
  assert.equal(out2, 'B')
})

test('pickAbVariant stable', () => {
  assert.equal(
    pickAbVariant({ bodyA: 'a', bodyB: 'b', abPercent: 100, targetId: '1' }),
    'b',
  )
  assert.equal(
    pickAbVariant({ bodyA: 'a', bodyB: 'b', abPercent: 0, targetId: '1' }),
    'a',
  )
})
