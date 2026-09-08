import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getThread, append, clearThreads } from './store.js'

test('webchat store getThread and append', () => {
  clearThreads()
  append('t1', {
    id: '1',
    text: 'hello',
    senderId: 'u1',
    direction: 'inbound',
    at: new Date().toISOString(),
  })
  const thread = getThread('t1')
  assert.equal(thread.length, 1)
  assert.equal(thread[0]?.text, 'hello')
  clearThreads()
  assert.equal(getThread('t1').length, 0)
})
