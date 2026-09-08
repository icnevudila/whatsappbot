import http from 'node:http'
import type { HealthSnapshot } from '@wa/channels'

export type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  body: string,
) => Promise<void> | void

export type CreateServerOptions = {
  getHealth: () => HealthSnapshot | Promise<HealthSnapshot>
  routes?: Record<string, RouteHandler>
}

export async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

export function createHttpServer(options: CreateServerOptions) {
  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host ?? '127.0.0.1'
      const url = new URL(req.url ?? '/', `http://${host}`)
      const path = url.pathname

      if (req.method === 'GET' && (path === '/health' || path === '/ready')) {
        const health = await options.getHealth()
        const status = path === '/ready' ? (health.ready ? 200 : 503) : health.healthy ? 200 : 503
        sendJson(res, status, health)
        return
      }

      const key = `${req.method ?? 'GET'} ${path}`
      const handler = options.routes?.[key]
      if (handler) {
        const body = req.method === 'GET' || req.method === 'HEAD' ? '' : await readBody(req)
        await handler(req, res, url, body)
        return
      }

      sendJson(res, 404, { error: 'not_found' })
    } catch (error) {
      sendJson(res, 500, {
        error: 'internal_error',
        detail: error instanceof Error ? error.message : String(error),
      })
    }
  })

  return {
    server,
    listen(port: number, host = '0.0.0.0') {
      return new Promise<void>((resolve) => {
        server.listen(port, host, () => resolve())
      })
    },
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
    },
  }
}
