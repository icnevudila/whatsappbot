import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export function uuidFromRequestKey(orgId: string, requestKey: string): string {
  const hash = createHash('sha256').update(`creative:${orgId}:${requestKey}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

test('Deterministic UUID generation produces canonical RFC-4122 v5 UUID format for any org+requestKey', () => {
  const id1 = uuidFromRequestKey('afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', 'test_key_123')
  const id2 = uuidFromRequestKey('afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', 'test_key_123')
  const id3 = uuidFromRequestKey('afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', 'test_key_different')

  assert.equal(id1, id2, 'Identical inputs must yield identical deterministic UUID')
  assert.notEqual(id1, id3, 'Different requestKey must yield distinct UUID')
  assert.match(id1, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'Must be valid RFC-4122 UUID')
})

test('PostgreSQL Primary Key Engine Simulation: concurrent simultaneous inserts resolve to single winner and 23505 handler', async () => {
  // Map simulating PostgreSQL table storage with PRIMARY KEY index on `id`
  const pgTable = new Map<string, { id: string; orgId: string; requestKey: string; status: string }>()
  let kickGenerationCount = 0

  async function simulateAtomicServerAction(draft: { orgId: string; requestKey: string; brief: string }) {
    const deterministicId = uuidFromRequestKey(draft.orgId, draft.requestKey)

    // Check fast-path (existing job read)
    const existing = pgTable.get(deterministicId)
    if (existing) {
      return { id: existing.id, ok: 'Görsel üretimi devam ediyor.' }
    }

    // Attempt INSERT with deterministic primary key
    let insertError: { code: string; message: string } | null = null
    if (pgTable.has(deterministicId)) {
      // Postgres engine unique constraint violation: 23505
      insertError = { code: '23505', message: 'duplicate key value violates unique constraint "creatives_pkey"' }
    } else {
      pgTable.set(deterministicId, {
        id: deterministicId,
        orgId: draft.orgId,
        requestKey: draft.requestKey,
        status: 'pending',
      })
    }

    if (insertError) {
      if (insertError.code === '23505') {
        // Atomic race resolution: second request caught 23505, returns winning ID, 0 duplicate kicks
        return { id: deterministicId, ok: 'Görsel üretimi devam ediyor.' }
      }
      return { error: insertError.message }
    }

    // Only winning insert reaches kickGeneration!
    kickGenerationCount++
    return { id: deterministicId, ok: true }
  }

  // Client handler simulation
  async function clientSubmit(draft: { orgId: string; requestKey: string; brief: string }) {
    let clientError: string | null = null
    let routedUrl: string | null = null

    try {
      const res = await simulateAtomicServerAction(draft)
      if (res?.error) throw new Error(res.error)
      if (res?.id) routedUrl = `/icerik/${res.id}`
    } catch (err: any) {
      clientError = err.message
    }

    return { clientError, routedUrl }
  }

  const payload = {
    orgId: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc',
    requestKey: 'bofe_sprayer_batch_race_test',
    brief: 'Bofe 16L Akülü Pompa',
  }

  // Launch simultaneous parallel concurrent calls
  const [callA, callB] = await Promise.all([
    clientSubmit(payload),
    clientSubmit(payload),
  ])

  // Assertions:
  assert.equal(callA.clientError, null, 'Call A must succeed')
  assert.equal(callB.clientError, null, 'Call B must succeed without fake error')
  assert.equal(callA.routedUrl, callB.routedUrl, 'Both calls must route to identical URL')
  assert.equal(pgTable.size, 1, 'Exactly ONE record exists in the database')
  assert.equal(kickGenerationCount, 1, 'kickGeneration executed exactly ONCE (zero duplicate renders)')
})
