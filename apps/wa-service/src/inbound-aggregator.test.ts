import test from 'node:test'
import assert from 'node:assert/strict'

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
process.env.WORKER_ID = process.env.WORKER_ID || 'test-worker'

test('schedulePregenerateAiSuggestions buffers rapid messages without throwing', async () => {
  const { schedulePregenerateAiSuggestions } = await import('./inbound.js')
  assert.equal(typeof schedulePregenerateAiSuggestions, 'function')

  schedulePregenerateAiSuggestions({
    orgId: 'test-org-123',
    phoneE164: '+905559998877',
    body: 'Merhaba',
  })

  schedulePregenerateAiSuggestions({
    orgId: 'test-org-123',
    phoneE164: '+905559998877',
    body: 'Şarjlı pompa vardı',
  })

  schedulePregenerateAiSuggestions({
    orgId: 'test-org-123',
    phoneE164: '+905559998877',
    body: 'Fiyatı nedir acaba?',
  })

  schedulePregenerateAiSuggestions({
    orgId: 'test-org-123',
    phoneE164: '+905559998877',
    body: '',
  })

  schedulePregenerateAiSuggestions({
    orgId: 'test-org-123',
    phoneE164: '+905559998877',
    body: 'İPTAL',
  })
})
