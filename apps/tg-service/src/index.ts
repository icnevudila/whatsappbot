import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HealthSnapshot } from '@wa/channels'
import { createHttpServer, createLogger, sendJson } from '@wa/channel-runtime'
import { parseInbound, sendMessage } from './adapter.js'
import { CHANNEL, env } from './env.js'

const logger = createLogger('tg-service')
const startedAt = Date.now()

export function getHealth(): HealthSnapshot {
  return {
    healthy: true,
    ready: true,
    channel: Array.isArray(CHANNEL) ? [...CHANNEL] : CHANNEL,
    mockMode: env.mockMode,
    role: 'messaging',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  }
}

export function createApp() {
  return createHttpServer({
    getHealth,
    routes: {
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
    },
  })
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  const app = createApp()
  await app.listen(env.port)
  logger.info({ port: env.port, channel: CHANNEL, mockMode: env.mockMode }, 'listening')
}

export { env }
