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
  const originalToken = process.env.OMNISTUDIO_GATEWAY_TOKEN
  process.env.OMNISTUDIO_GATEWAY_TOKEN = 'fixture-token-not-a-real-secret'
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
  } finally {
    globalThis.fetch = originalFetch
    if (originalToken === undefined) delete process.env.OMNISTUDIO_GATEWAY_TOKEN
    else process.env.OMNISTUDIO_GATEWAY_TOKEN = originalToken
  }
})


test('campaign text forwards tenant and creative conversation identity to the gateway', async () => {
  const originalToken = process.env.OMNISTUDIO_GATEWAY_TOKEN
  process.env.OMNISTUDIO_GATEWAY_TOKEN = 'fixture-token-not-a-real-secret'
  const originalFetch=globalThis.fetch
  let captured: Record<string,unknown>|null=null
  globalThis.fetch=async (_url, options)=>{
    captured=JSON.parse(String(options?.body))
    return Response.json({choices:[{message:{content:'Doğrulanmış kampanya metni'}}]})
  }
  try {
    const output=await completeText('Use verified facts','Ürün bilgisi',null,{tenantId:'tenant-a',customer:'Alt marka',conversationId:'campaign:creative-a',requestId:'request-a'})
    assert.equal(output,'Doğrulanmış kampanya metni')
    assert.deepEqual(captured && {tenant:captured['tenant_id'],org:captured['org_id'],customer:captured['customer'],conversation:captured['conversation_id'],request:captured['request_id']},
      {tenant:'tenant-a',org:'tenant-a',customer:'Alt marka',conversation:'campaign:creative-a',request:'request-a'})
  } finally {
    globalThis.fetch=originalFetch
    if (originalToken === undefined) delete process.env.OMNISTUDIO_GATEWAY_TOKEN
    else process.env.OMNISTUDIO_GATEWAY_TOKEN = originalToken
  }
})
