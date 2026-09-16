import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
process.env.WORKER_ID = process.env.WORKER_ID || 'test-worker'

test('pregenerateAiSuggestions exports correctly and handles empty inputs safely', async () => {
  const { pregenerateAiSuggestions } = await import('./auto-reply.js')
  assert.equal(typeof pregenerateAiSuggestions, 'function')

  // Empty or whitespace should return safely without throwing
  await pregenerateAiSuggestions({ orgId: 'test-org', phoneE164: null, body: '' })
  await pregenerateAiSuggestions({ orgId: 'test-org', phoneE164: '+905428212205', body: ' ' })
  await pregenerateAiSuggestions({ orgId: 'test-org', phoneE164: '+905428212205', body: 'a' })
})
