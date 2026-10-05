import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveSubmissionIdentity } from './submission-identity'

const id1 = '11111111-1111-4111-8111-111111111111'
const id2 = '22222222-2222-4222-8222-222222222222'
test('lost response and reload reuse identity; changed draft and tenant get a new identity', () => {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value) } }
  const initial = resolveSubmissionIdentity({ fingerprint: 'sku+offer', storageKey: 'tenant-A:image', storage, previous: null, createId: () => id1 })
  const restored = resolveSubmissionIdentity({ fingerprint: 'sku+offer', storageKey: 'tenant-A:image', storage, previous: null, createId: () => id2 })
  assert.equal(restored.id, initial.id)
  const changed = resolveSubmissionIdentity({ fingerprint: 'sku+new-offer', storageKey: 'tenant-A:image', storage, previous: initial, createId: () => id2 })
  assert.equal(changed.id, id2)
  assert.equal(resolveSubmissionIdentity({ fingerprint: 'sku+offer', storageKey: 'tenant-B:image', storage, previous: null, createId: () => id2 }).id, id2)
})
test('blocked storage retains identity in memory and corrupt storage cannot supply a request ID', () => {
  const storage = { getItem: () => '{broken', setItem: () => { throw new Error('blocked') } }
  const first = resolveSubmissionIdentity({ fingerprint: 'draft', storageKey: 'key', storage, previous: null, createId: () => id1 })
  assert.equal(resolveSubmissionIdentity({ fingerprint: 'draft', storageKey: 'key', storage, previous: first, createId: () => id2 }).id, id1)
})
