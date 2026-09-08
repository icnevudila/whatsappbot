/**
 * Refactors all channel service index.ts to export createApp() and only listen when main.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const apps = fs
  .readdirSync(path.join(root, 'apps'))
  .filter((d) => d.endsWith('-service') && d !== 'wa-service')

for (const dir of apps) {
  const indexPath = path.join(root, 'apps', dir, 'src', 'index.ts')
  if (!fs.existsSync(indexPath)) continue
  let src = fs.readFileSync(indexPath, 'utf8')
  if (src.includes('export function createApp')) continue

  // Detect kind from existing import
  const isMessaging = src.includes('parseInbound')
  const adapterImport = isMessaging
    ? "import { parseInbound, sendMessage } from './adapter.js'"
    : "import { lookupOrder, lookupStock } from './adapter.js'"

  // Keep CHANNEL import
  const envLine = "import { CHANNEL, env } from './env.js'"

  const routes = isMessaging
    ? `routes: {
      'POST /webhook': async (_req, res, _url, body) => {
        let raw: unknown = {}
        try { raw = body ? JSON.parse(body) : {} } catch {
          sendJson(res, 400, { error: 'invalid_json' }); return
        }
        const event = parseInbound(raw)
        if (!event) { sendJson(res, 400, { error: 'invalid_event' }); return }
        sendJson(res, 200, { ok: true, event })
      },
      'POST /send': async (_req, res, _url, body) => {
        let raw: Record<string, unknown> = {}
        try { raw = body ? (JSON.parse(body) as Record<string, unknown>) : {} } catch {
          sendJson(res, 400, { error: 'invalid_json' }); return
        }
        const text = typeof raw.text === 'string' ? raw.text : ''
        const threadId = String(raw.threadId ?? '')
        if (!text || !threadId) {
          sendJson(res, 400, { error: 'text_and_threadId_required' }); return
        }
        const result = await sendMessage({
          orgId: env.orgId,
          accountId: env.accountId,
          channel: Array.isArray(CHANNEL) ? CHANNEL[0]! : CHANNEL,
          threadId,
          text,
          metadata: raw.metadata as Record<string, unknown> | undefined,
        })
        sendJson(res, result.ok ? 200 : 502, result)
      },
      'GET /webhook': async (_req, res, url) => {
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
    }`
    : `routes: {
      'POST /lookup': async (_req, res, _url, body) => {
        let raw: Record<string, unknown> = {}
        try { raw = body ? (JSON.parse(body) as Record<string, unknown>) : {} } catch {
          sendJson(res, 400, { error: 'invalid_json' }); return
        }
        if (typeof raw.orderId === 'string') {
          const result = await lookupOrder(raw.orderId)
          sendJson(res, result.ok ? 200 : 502, result); return
        }
        if (typeof raw.sku === 'string') {
          const result = await lookupStock(raw.sku)
          sendJson(res, result.ok ? 200 : 502, result); return
        }
        sendJson(res, 400, { error: 'orderId_or_sku_required' })
      },
    }`

  const role = isMessaging ? 'messaging' : dir.includes('erp') ? 'erp' : dir.includes('crm') ? 'crm' : dir.includes('trendyol') || dir.includes('hepsiburada') ? 'marketplace' : 'commerce'

  src = `import process from 'node:process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { HealthSnapshot } from '@wa/channels'
import { createHttpServer, createLogger, sendJson } from '@wa/channel-runtime'
${adapterImport}
${envLine}

const logger = createLogger('${dir}')
const startedAt = Date.now()

export function getHealth(): HealthSnapshot {
  return {
    healthy: true,
    ready: true,
    channel: Array.isArray(CHANNEL) ? [...CHANNEL] : CHANNEL,
    mockMode: env.mockMode,
    role: '${role}',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  }
}

export function createApp() {
  return createHttpServer({
    getHealth,
    ${routes},
  })
}

const isMain =
  Boolean(process.argv[1]) &&
  pathToFileURL(path.resolve(process.argv[1]!)).href === import.meta.url

if (isMain) {
  const app = createApp()
  await app.listen(env.port)
  logger.info({ port: env.port, channel: CHANNEL, mockMode: env.mockMode }, 'listening')
}

export { env, CHANNEL }
`
  fs.writeFileSync(indexPath, src)
  console.log('patched', dir)
}

console.log('done', apps.length)
