import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { ideasoftOrderPath, lookupOrder, lookupStock } from './adapter.js'

test('ideasoft paths + mock', async () => {
  assert.equal(ideasoftOrderPath('3'), '/admin-api/orders/3')
  const order = await lookupOrder('3')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.equal((await lookupStock('S')).data?.stock, 4)
})

test('ideasoft LIVE order lookup with sample credentials against mock API', async () => {
  const mock = createMockHttp()
  mock.on('GET', ideasoftOrderPath('3'), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    return { json: { id: 3, status: 'waiting', amount: 210 } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('3', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.genericBearer,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
