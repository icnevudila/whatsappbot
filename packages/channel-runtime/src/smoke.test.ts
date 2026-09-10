import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHttpServer } from './http.js'
import { withTempServer } from './smoke.js'

test('withTempServer binds ephemeral port', async () => {
  const app = createHttpServer({
    getHealth: () => ({
      healthy: true,
      ready: true,
      channel: 'telegram',
      mockMode: true,
    }),
  })

  await withTempServer(app, async (base) => {
    const res = await fetch(`${base}/health`)
    assert.equal(res.status, 200)
  })
})
