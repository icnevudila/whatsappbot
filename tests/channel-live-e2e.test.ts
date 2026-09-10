/**
 * Uçtan uca LIVE path: sample credential + vendor sandbox (internet’ten çalınmış token YOK).
 * Gerçek Telegram/Meta/LINE public sandbox token yayınlamaz; bu harness API şeklini doğrular.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SAMPLE_CREDENTIALS, startVendorSandbox } from '@wa/channel-runtime'
import { sendMessage as tgSend } from '../apps/tg-service/src/adapter.js'
import { sendMessage as metaSend } from '../apps/meta-service/src/adapter.js'
import { sendMessage as lineSend } from '../apps/line-service/src/adapter.js'
import { sendMessage as wechatSend } from '../apps/wechat-service/src/adapter.js'
import { sendMessage as webchatSend } from '../apps/webchat-service/src/adapter.js'
import { lookupOrder as shopifyOrder } from '../apps/shopify-service/src/adapter.js'
import { lookupOrder as wooOrder } from '../apps/woo-service/src/adapter.js'

test('e2e LIVE messaging adapters against vendor sandbox', async () => {
  const sandbox = await startVendorSandbox()
  try {
    const common = {
      orgId: '00000000-0000-0000-0000-000000000001',
      accountId: '00000000-0000-0000-0000-000000000002',
    }

    const tg = await tgSend(
      { ...common, channel: 'telegram', threadId: '100', text: 'e2e tg' },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.telegramToken,
        apiBase: sandbox.base,
      },
    )
    assert.equal(tg.ok, true)
    assert.equal(tg.mock, false)

    const meta = await metaSend(
      { ...common, channel: 'instagram', threadId: 'ig-1', text: 'e2e meta' },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.metaPageToken,
        apiBase: sandbox.base,
        pageId: SAMPLE_CREDENTIALS.metaPageId,
      },
    )
    assert.equal(meta.ok, true)
    assert.equal(meta.mock, false)

    const line = await lineSend(
      { ...common, channel: 'line', threadId: 'U1', text: 'e2e line' },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.lineChannelToken,
        apiBase: sandbox.base,
      },
    )
    assert.equal(line.ok, true)

    const wechat = await wechatSend(
      { ...common, channel: 'wechat', threadId: 'wx-1', text: 'e2e wechat' },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.wechatToken,
        apiBase: sandbox.base,
      },
    )
    assert.equal(wechat.ok, true)

    const webchat = await webchatSend(
      { ...common, channel: 'webchat', threadId: 'sess-1', text: 'e2e webchat' },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.webchatToken,
        apiBase: sandbox.base,
      },
    )
    assert.equal(webchat.ok, true)

    assert.ok(sandbox.calls.length >= 4, 'sandbox should see outbound calls')
  } finally {
    await sandbox.close()
  }
})

test('e2e LIVE commerce adapters against vendor sandbox', async () => {
  const sandbox = await startVendorSandbox()
  try {
    const shop = await shopifyOrder('1001', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.shopifyToken,
      apiBase: sandbox.base,
    })
    assert.equal(shop.ok, true)
    assert.equal(shop.mock, false)

    const woo = await wooOrder('1001', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.wooKeySecret,
      apiBase: sandbox.base,
    })
    assert.equal(woo.ok, true)
    assert.equal(woo.mock, false)
  } finally {
    await sandbox.close()
  }
})

test('public internet HTTP smoke (httpbin) — network path works', async () => {
  const res = await fetch('https://httpbin.org/post', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${SAMPLE_CREDENTIALS.genericBearer}`,
    },
    body: JSON.stringify({ source: 'whatsappbot-channel-e2e', ts: Date.now() }),
  })
  assert.ok(res.status >= 200 && res.status < 500)
  if (res.ok) {
    const json = (await res.json()) as { json?: { source?: string }; headers?: Record<string, string> }
    assert.equal(json.json?.source, 'whatsappbot-channel-e2e')
  }
})
