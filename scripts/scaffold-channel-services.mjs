/**
 * Generates channel microservices under apps/* with mock-mode defaults.
 * Run: node scripts/scaffold-channel-services.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const services = [
  { dir: 'tg-service', pkg: '@wa/tg-service', channel: 'telegram', kind: 'messaging' },
  { dir: 'meta-service', pkg: '@wa/meta-service', channel: ['instagram', 'facebook'], kind: 'messaging' },
  { dir: 'rcs-service', pkg: '@wa/rcs-service', channel: 'rcs', kind: 'messaging' },
  { dir: 'line-service', pkg: '@wa/line-service', channel: 'line', kind: 'messaging' },
  { dir: 'wechat-service', pkg: '@wa/wechat-service', channel: 'wechat', kind: 'messaging' },
  { dir: 'webchat-service', pkg: '@wa/webchat-service', channel: 'webchat', kind: 'messaging' },
  { dir: 'shopify-service', pkg: '@wa/shopify-service', channel: 'shopify', kind: 'commerce' },
  { dir: 'ikas-service', pkg: '@wa/ikas-service', channel: 'ikas', kind: 'commerce' },
  { dir: 'woo-service', pkg: '@wa/woo-service', channel: 'woocommerce', kind: 'commerce' },
  { dir: 'magento-service', pkg: '@wa/magento-service', channel: 'magento', kind: 'commerce' },
  { dir: 'tsoft-service', pkg: '@wa/tsoft-service', channel: 'tsoft', kind: 'commerce' },
  { dir: 'ticimax-service', pkg: '@wa/ticimax-service', channel: 'ticimax', kind: 'commerce' },
  { dir: 'ideasoft-service', pkg: '@wa/ideasoft-service', channel: 'ideasoft', kind: 'commerce' },
  { dir: 'proje-service', pkg: '@wa/proje-service', channel: 'proje', kind: 'commerce' },
  { dir: 'trendyol-service', pkg: '@wa/trendyol-service', channel: 'trendyol', kind: 'marketplace' },
  { dir: 'hepsiburada-service', pkg: '@wa/hepsiburada-service', channel: 'hepsiburada', kind: 'marketplace' },
  { dir: 'erp-service', pkg: '@wa/erp-service', channel: ['sap', 'oracle', 'ifs', 'nebim'], kind: 'erp' },
  { dir: 'crm-service', pkg: '@wa/crm-service', channel: ['hubspot', 'zendesk', 'calendar'], kind: 'crm' },
]

function channelLiteral(channel) {
  return Array.isArray(channel)
    ? `[${channel.map((c) => `'${c}'`).join(', ')}] as const`
    : `'${channel}' as const`
}

function primaryChannel(channel) {
  return Array.isArray(channel) ? channel[0] : channel
}

for (const svc of services) {
  const base = path.join(root, 'apps', svc.dir, 'src')
  fs.mkdirSync(base, { recursive: true })

  const packageJson = {
    name: svc.pkg,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'node --env-file-if-exists=.env --import tsx --watch src/index.ts',
      start: 'node --env-file-if-exists=.env --import tsx src/index.ts',
      typecheck: 'tsc --noEmit',
      test: 'node --import tsx --test src/**/*.test.ts',
    },
    dependencies: {
      '@wa/channels': '*',
      '@wa/channel-runtime': '*',
      pino: '10.3.1',
      tsx: '4.23.13',
    },
    devDependencies: {
      '@types/node': '^22',
      typescript: '^5',
    },
  }

  if (svc.dir === 'tg-service') {
    packageJson.dependencies.grammy = '^1.45.1'
  }

  fs.writeFileSync(
    path.join(root, 'apps', svc.dir, 'package.json'),
    JSON.stringify(packageJson, null, 2) + '\n',
  )

  fs.writeFileSync(
    path.join(root, 'apps', svc.dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022'],
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          noUncheckedIndexedAccess: true,
          noEmit: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          types: ['node'],
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ) + '\n',
  )

  const channelExpr = channelLiteral(svc.channel)
  const primary = primaryChannel(svc.channel)

  fs.writeFileSync(
    path.join(base, 'env.ts'),
    `import { boolEnv, intEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export const CHANNEL = ${channelExpr}
export const KIND = '${svc.kind}' as const

export const env = {
  port: intEnv('PORT', ${3000 + services.indexOf(svc)}),
  mockMode: isMockMode(true),
  orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
  accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
  token: process.env.CHANNEL_TOKEN?.trim() || '',
  verifyToken: process.env.VERIFY_TOKEN?.trim() || 'dev-verify',
  apiBase: process.env.API_BASE?.trim() || '',
  liveEnabled: boolEnv('LIVE_ENABLED', false),
}
`,
  )

  if (svc.kind === 'messaging') {
    fs.writeFileSync(
      path.join(base, 'adapter.ts'),
      `import {
  buildChannelEvent,
  type ChannelEvent,
  type SendMessageInput,
  type SendMessageResult,
} from '@wa/channels'
import { env, CHANNEL } from './env.js'

const primary = Array.isArray(CHANNEL) ? CHANNEL[0] : CHANNEL

export function parseInbound(raw: unknown): ChannelEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const text =
    typeof body.text === 'string'
      ? body.text
      : typeof (body.message as { text?: string } | undefined)?.text === 'string'
        ? (body.message as { text: string }).text
        : undefined
  const threadId = String(body.threadId ?? body.chatId ?? body.senderId ?? 'unknown')
  const senderId = String(body.senderId ?? body.from ?? threadId)
  const externalMessageId =
    typeof body.messageId === 'string' ? body.messageId : typeof body.id === 'string' ? body.id : undefined

  return buildChannelEvent({
    channel: primary,
    orgId: env.orgId,
    accountId: env.accountId,
    direction: 'inbound',
    externalThreadId: threadId,
    externalMessageId,
    senderId,
    text,
    payload: body,
  })
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return {
      ok: true,
      externalMessageId: \`mock-\${primary}-\${Date.now()}\`,
      mock: true,
    }
  }

  // Canli yollar servis ozelinde genisletilir; burada guvenli fallback.
  try {
    const res = await fetch(\`\${env.apiBase || 'https://example.invalid'}/send\`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: \`Bearer \${env.token}\`,
      },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      return { ok: false, error: \`http_\${res.status}\`, mock: false }
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, externalMessageId: data.id ?? \`live-\${Date.now()}\`, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}
`,
    )
  } else {
    fs.writeFileSync(
      path.join(base, 'adapter.ts'),
      `import type { CommerceLookupResult } from '@wa/channels'
import { env, CHANNEL } from './env.js'

const primary = Array.isArray(CHANNEL) ? CHANNEL[0] : CHANNEL

export async function lookupOrder(orderId: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return {
      ok: true,
      mock: true,
      data: {
        channel: primary,
        orderId,
        status: 'processing',
        total: 199.9,
        currency: 'TRY',
      },
    }
  }

  try {
    const base = env.apiBase || 'https://example.invalid'
    const res = await fetch(\`\${base}/orders/\${encodeURIComponent(orderId)}\`, {
      headers: { authorization: \`Bearer \${env.token}\` },
    })
    if (!res.ok) return { ok: false, error: \`http_\${res.status}\`, mock: false }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}

export async function lookupStock(sku: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: primary, sku, available: 12 },
    }
  }
  try {
    const base = env.apiBase || 'https://example.invalid'
    const res = await fetch(\`\${base}/stock/\${encodeURIComponent(sku)}\`, {
      headers: { authorization: \`Bearer \${env.token}\` },
    })
    if (!res.ok) return { ok: false, error: \`http_\${res.status}\`, mock: false }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}
`,
    )
  }

  const indexRoutes =
    svc.kind === 'messaging'
      ? `routes: {
      'POST /webhook': async (_req, res, _url, body) => {
        let raw: unknown = {}
        try {
          raw = body ? JSON.parse(body) : {}
        } catch {
          sendJson(res, 400, { error: 'invalid_json' })
          return
        }
        const event = parseInbound(raw)
        if (!event) {
          sendJson(res, 400, { error: 'invalid_event' })
          return
        }
        sendJson(res, 200, { ok: true, event })
      },
      'POST /send': async (_req, res, _url, body) => {
        let raw: Record<string, unknown> = {}
        try {
          raw = body ? (JSON.parse(body) as Record<string, unknown>) : {}
        } catch {
          sendJson(res, 400, { error: 'invalid_json' })
          return
        }
        const text = typeof raw.text === 'string' ? raw.text : ''
        const threadId = String(raw.threadId ?? '')
        if (!text || !threadId) {
          sendJson(res, 400, { error: 'text_and_threadId_required' })
          return
        }
        const result = await sendMessage({
          orgId: env.orgId,
          accountId: env.accountId,
          channel: Array.isArray(CHANNEL) ? CHANNEL[0] : CHANNEL,
          threadId,
          text,
        })
        sendJson(res, result.ok ? 200 : 502, result)
      },
      'GET /webhook': async (_req, res, url) => {
        // Meta-style verify
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')
        if (mode === 'subscribe' && token === env.verifyToken && challenge) {
          res.writeHead(200, { 'content-type': 'text/plain' })
          res.end(challenge)
          return
        }
        sendJson(res, 403, { error: 'verify_failed' })
      },
    },`
      : `routes: {
      'GET /orders/:id': async (_req, res, url) => {
        const orderId = url.pathname.split('/').pop() || ''
        const result = await lookupOrder(orderId)
        sendJson(res, result.ok ? 200 : 502, result)
      },
      'GET /stock/:sku': async (_req, res, url) => {
        const sku = url.pathname.split('/').pop() || ''
        const result = await lookupStock(sku)
        sendJson(res, result.ok ? 200 : 502, result)
      },
      'POST /lookup': async (_req, res, _url, body) => {
        let raw: Record<string, unknown> = {}
        try {
          raw = body ? (JSON.parse(body) as Record<string, unknown>) : {}
        } catch {
          sendJson(res, 400, { error: 'invalid_json' })
          return
        }
        if (typeof raw.orderId === 'string') {
          sendJson(res, 200, await lookupOrder(raw.orderId))
          return
        }
        if (typeof raw.sku === 'string') {
          sendJson(res, 200, await lookupStock(raw.sku))
          return
        }
        sendJson(res, 400, { error: 'orderId_or_sku_required' })
      },
    },`

  // Fix commerce routes - createHttpServer uses exact path keys, not params.
  // Use /lookup only for commerce in index to avoid path param issues.
  const indexRoutesFixed =
    svc.kind === 'messaging'
      ? indexRoutes
      : `routes: {
      'POST /lookup': async (_req, res, _url, body) => {
        let raw: Record<string, unknown> = {}
        try {
          raw = body ? (JSON.parse(body) as Record<string, unknown>) : {}
        } catch {
          sendJson(res, 400, { error: 'invalid_json' })
          return
        }
        if (typeof raw.orderId === 'string') {
          const result = await lookupOrder(raw.orderId)
          sendJson(res, result.ok ? 200 : 502, result)
          return
        }
        if (typeof raw.sku === 'string') {
          const result = await lookupStock(raw.sku)
          sendJson(res, result.ok ? 200 : 502, result)
          return
        }
        sendJson(res, 400, { error: 'orderId_or_sku_required' })
      },
    },`

  fs.writeFileSync(
    path.join(base, 'index.ts'),
    `import process from 'node:process'
import type { HealthSnapshot } from '@wa/channels'
import { createHttpServer, createLogger, sendJson } from '@wa/channel-runtime'
import { ${svc.kind === 'messaging' ? 'parseInbound, sendMessage' : 'lookupOrder, lookupStock'} } from './adapter.js'
import { CHANNEL, env } from './env.js'

const logger = createLogger('${svc.dir}')
const startedAt = Date.now()

function getHealth(): HealthSnapshot {
  return {
    healthy: true,
    ready: true,
    channel: Array.isArray(CHANNEL) ? [...CHANNEL] : CHANNEL,
    mockMode: env.mockMode,
    role: '${svc.kind}',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  }
}

const app = createHttpServer({
  getHealth,
  ${indexRoutesFixed}
})

if (process.env.NODE_ENV !== 'test') {
  await app.listen(env.port)
  logger.info({ port: env.port, channel: CHANNEL, mockMode: env.mockMode }, 'listening')
}

export { app, getHealth, env }
`,
  )

  fs.writeFileSync(
    path.join(base, 'adapter.test.ts'),
    svc.kind === 'messaging'
      ? `import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseInbound, sendMessage } from './adapter.js'
import { CHANNEL, env } from './env.js'

test('${svc.dir} parseInbound + mock send', async () => {
  const event = parseInbound({ text: 'merhaba', chatId: '100', senderId: '9', messageId: 'm1' })
  assert.ok(event)
  assert.equal(event.text, 'merhaba')
  assert.equal(event.externalThreadId, '100')
  const primary = Array.isArray(CHANNEL) ? CHANNEL[0] : CHANNEL
  assert.equal(event.channel, primary)

  const result = await sendMessage({
    orgId: env.orgId,
    accountId: env.accountId,
    channel: primary,
    threadId: '100',
    text: 'yanit',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.match(result.externalMessageId, /^mock-/)
})
`
      : `import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lookupOrder, lookupStock } from './adapter.js'

test('${svc.dir} mock order and stock', async () => {
  const order = await lookupOrder('ORD-1')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.equal(order.data?.orderId, 'ORD-1')

  const stock = await lookupStock('SKU-1')
  assert.equal(stock.ok, true)
  assert.equal(stock.mock, true)
  assert.equal(stock.data?.sku, 'SKU-1')
})
`,
  )

  fs.writeFileSync(
    path.join(root, 'apps', svc.dir, '.env.example'),
    `PORT=${3000 + services.indexOf(svc)}
MOCK_MODE=true
LIVE_ENABLED=false
CHANNEL_TOKEN=
VERIFY_TOKEN=dev-verify
API_BASE=
DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000001
DEFAULT_ACCOUNT_ID=00000000-0000-0000-0000-000000000002
`,
  )
}

console.log(`Scaffolded ${services.length} channel services.`)
