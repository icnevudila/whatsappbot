import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { crmTicketUrl, getProvider, lookupOrder } from './adapter.js'

test('crm ticket urls + mock', async () => {
  const provider = getProvider()
  assert.match(crmTicketUrl('https://crm.example', 'T-1', provider), /T-1/)
  const ticket = await lookupOrder('T-1')
  assert.equal(ticket.ok, true)
  assert.equal(ticket.mock, true)
  assert.equal(ticket.data?.provider, provider)
})

test('crm LIVE ticket lookup with sample credentials against mock API', async () => {
  const provider = 'hubspot'
  const mock = createMockHttp()
  mock.on('GET', '/crm/v3/objects/tickets/T-LIVE', (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    return { json: { id: 'T-LIVE', properties: { hs_pipeline_stage: 'open' } } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('T-LIVE', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.genericBearer,
      apiBase: base,
      provider,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
