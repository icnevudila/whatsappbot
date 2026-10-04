import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTextProviderOrder, resolveImageProviderOrder, type AiKeyBag } from './config'
import { completeText } from './text'

test('tenant paid-provider preferences and keys cannot enable an external fallback', () => {
  for (const preference of ['openai', 'gemini', 'cloudflare', 'pollinations', 'auto']) {
    const bag: AiKeyBag = { preferredImageProvider: preference, preferredTextProvider: preference,
      openaiApiKey: 'test-only', geminiApiKey: 'test-only' }
    assert.deepEqual(resolveTextProviderOrder(bag), ['omnistudio'])
    assert.deepEqual(resolveImageProviderOrder(bag), ['omnistudio'])
  }
})
test('mutating a caller provider list cannot alter the global policy', () => {
  resolveImageProviderOrder().push('openai')
  resolveTextProviderOrder().push('gemini')
  assert.deepEqual(resolveTextProviderOrder(), ['omnistudio'])
  assert.deepEqual(resolveImageProviderOrder(), ['omnistudio'])
})

test('OmniStudio HTTP failure never calls paid endpoints even with valid-looking tenant keys', async () => {
  const originalFetch = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = async (url) => {
    urls.push(String(url))
    return new Response('fixture unavailable', { status: 503 })
  }
  try {
    await assert.rejects(completeText('Test system', 'Test request', {
      preferredTextProvider: 'openai', openaiApiKey: 'test-only', geminiApiKey: 'test-only',
    }))
    assert.equal(urls.length, 1)
    assert.doesNotMatch(urls.join(' '), /api\.openai\.com|generativelanguage\.googleapis\.com/)
    assert.match(urls[0], /\/v1\/chat\/completions$/)
  } finally { globalThis.fetch = originalFetch }
})
