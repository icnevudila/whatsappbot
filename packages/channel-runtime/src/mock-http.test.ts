import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from './mock-http.js'

test('createMockHttp serves json and records calls', async () => {
  const mock = createMockHttp()
  mock.on('POST', '/v1/send', { json: { id: 'ok-1' } })
  const { base, close } = await mock.listen()
  try {
    const res = await fetch(`${base}/v1/send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${SAMPLE_CREDENTIALS.genericBearer}` },
      body: JSON.stringify({ text: 'hi' }),
    })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { id: 'ok-1' })
    assert.equal(mock.calls.length, 1)
    assert.match(mock.calls[0]!.headers.authorization ?? '', /sample-bearer/)
  } finally {
    await close()
  }
})
