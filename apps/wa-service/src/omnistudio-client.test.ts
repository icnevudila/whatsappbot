import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchFromOmniStudio } from './omnistudio-client.js'

test('chat authentication is scoped and preserves caller credentials', async () => {
  const oldFetch = globalThis.fetch
  const oldToken = process.env.OMNISTUDIO_GATEWAY_TOKEN
  const oldFallback = process.env.CHATGPT_API_KEY
  const observed: Headers[] = []
  process.env.OMNISTUDIO_GATEWAY_TOKEN = 'test-dedicated-key'
  process.env.CHATGPT_API_KEY = 'test-fallback-key'
  globalThis.fetch = async (_url, init) => {
    observed.push(new Headers(init?.headers))
    return new Response('{}', { status: 200 })
  }
  try {
    await fetchFromOmniStudio('/v1/chat/suggestions', { method: 'POST' })
    await fetchFromOmniStudio('/chat/completions', { headers: { Authorization: 'Bearer explicit' } })
    await fetchFromOmniStudio('/worker/heartbeat', { headers: { 'Content-Type': 'application/json' } })
    assert.equal(observed[0].get('Authorization'), 'Bearer test-dedicated-key')
    assert.equal(observed[1].get('Authorization'), 'Bearer explicit')
    assert.equal(observed[2].get('Authorization'), null)
    assert.equal(observed[2].get('Content-Type'), 'application/json')
    delete process.env.OMNISTUDIO_GATEWAY_TOKEN
    await fetchFromOmniStudio('/v1/chat/suggestions', {})
    assert.equal(observed[3].get('Authorization'), 'Bearer test-fallback-key')
  } finally {
    globalThis.fetch = oldFetch
    if (oldToken === undefined) delete process.env.OMNISTUDIO_GATEWAY_TOKEN
    else process.env.OMNISTUDIO_GATEWAY_TOKEN = oldToken
    if (oldFallback === undefined) delete process.env.CHATGPT_API_KEY
    else process.env.CHATGPT_API_KEY = oldFallback
  }
})
