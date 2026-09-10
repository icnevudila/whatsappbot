import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { lookupOrder, lookupStock, ticimaxOrderPath } from './adapter.js'

test('ticimax paths + mock', async () => {
  assert.equal(ticimaxOrderPath('7'), '/api/siparis/7')
  const order = await lookupOrder('7')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.equal(order.data?.Durumu, 'Onaylandi')
  assert.equal((await lookupStock('X')).data?.StokAdedi, 9)
})

test('ticimax LIVE order lookup with sample credentials against mock API', async () => {
  const mock = createMockHttp()
  mock.on('GET', ticimaxOrderPath('7'), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    return { json: { SiparisID: 7, Durumu: 'Onaylandi', ToplamTutar: 780 } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('7', {
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
