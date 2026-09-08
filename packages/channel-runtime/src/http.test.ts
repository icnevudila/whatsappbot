import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHttpServer } from './http.js'

test('health and ready endpoints', async () => {
  const app = createHttpServer({
    getHealth: () => ({
      healthy: true,
      ready: true,
      channel: 'telegram',
      mockMode: true,
    }),
  })
  await app.listen(0, '127.0.0.1')
  const addr = app.server.address()
  assert.ok(addr && typeof addr === 'object')
  const base = `http://127.0.0.1:${addr.port}`

  const health = await fetch(`${base}/health`)
  assert.equal(health.status, 200)
  const body = (await health.json()) as { channel: string; mockMode: boolean }
  assert.equal(body.channel, 'telegram')
  assert.equal(body.mockMode, true)

  const ready = await fetch(`${base}/ready`)
  assert.equal(ready.status, 200)

  await app.close()
})
