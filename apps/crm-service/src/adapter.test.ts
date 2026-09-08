import assert from 'node:assert/strict'
import { test } from 'node:test'
import { crmTicketUrl, lookupOrder, provider } from './adapter.js'

test('crm ticket urls + mock', async () => {
  assert.match(crmTicketUrl('https://crm.example', 'T-1'), /T-1/)
  const ticket = await lookupOrder('T-1')
  assert.equal(ticket.ok, true)
  assert.equal(ticket.data?.provider, provider)
})
