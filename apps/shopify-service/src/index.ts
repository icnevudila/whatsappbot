import process from 'node:process'
import type { HealthSnapshot } from '@wa/channels'
import { createHttpServer, createLogger, sendJson } from '@wa/channel-runtime'
import { lookupOrder, lookupStock } from './adapter.js'
import { CHANNEL, env } from './env.js'

const logger = createLogger('shopify-service')
const startedAt = Date.now()

function getHealth(): HealthSnapshot {
  return {
    healthy: true,
    ready: true,
    channel: Array.isArray(CHANNEL) ? [...CHANNEL] : CHANNEL,
    mockMode: env.mockMode,
    role: 'commerce',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  }
}

const app = createHttpServer({
  getHealth,
  routes: {
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
    },
})

if (process.env.NODE_ENV !== 'test') {
  await app.listen(env.port)
  logger.info({ port: env.port, channel: CHANNEL, mockMode: env.mockMode }, 'listening')
}

export { app, getHealth, env }
