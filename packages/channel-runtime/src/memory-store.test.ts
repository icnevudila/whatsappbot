import assert from 'node:assert/strict'
import { test } from 'node:test'
import { InMemoryEventStore } from './memory-store.js'

test('InMemoryEventStore append, list, clear', () => {
  const store = new InMemoryEventStore()
  assert.deepEqual(store.list(), [])

  store.append({ id: '1', kind: 'inbound' })
  store.append({ id: '2', kind: 'outbound' })
  assert.equal(store.list().length, 2)
  assert.equal(store.list(1).length, 1)
  assert.equal(store.list(1)[0]?.id, '2')

  store.clear()
  assert.deepEqual(store.list(), [])
})
