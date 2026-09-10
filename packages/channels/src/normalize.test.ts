import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildChannelEvent, isChannelId, normalizeText } from './normalize.js'

test('isChannelId accepts known channels', () => {
  assert.equal(isChannelId('telegram'), true)
  assert.equal(isChannelId('shopify'), true)
  assert.equal(isChannelId('nope'), false)
})

test('normalizeText trims and drops empty', () => {
  assert.equal(normalizeText('  merhaba  '), 'merhaba')
  assert.equal(normalizeText('   '), undefined)
  assert.equal(normalizeText(12), undefined)
})

test('buildChannelEvent fills defaults', () => {
  const event = buildChannelEvent({
    channel: 'telegram',
    orgId: 'org-1',
    accountId: 'acc-1',
    direction: 'inbound',
    externalThreadId: '42',
    senderId: '99',
    text: ' selam ',
  })
  assert.equal(event.text, 'selam')
  assert.match(event.id, /^telegram:/)
  assert.ok(event.occurredAt.includes('T'))
})
