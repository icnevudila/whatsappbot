import http from 'node:http'

export type MockRequest = {
  method: string
  url: string
  pathname: string
  headers: http.IncomingHttpHeaders
  body: string
}

export type MockResponse =
  | { status?: number; json: unknown }
  | { status?: number; text: string }
  | ((req: MockRequest) => MockResponse | Promise<MockResponse>)

/** Yerel HTTP mock — örnek credential ile canlı path testleri için. */
export function createMockHttp() {
  const handlers = new Map<string, MockResponse>()
  const calls: MockRequest[] = []

  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const body = Buffer.concat(chunks).toString('utf8')
    const host = req.headers.host ?? '127.0.0.1'
    const url = new URL(req.url ?? '/', `http://${host}`)
    const method = (req.method ?? 'GET').toUpperCase()
    const recorded: MockRequest = {
      method,
      url: url.toString(),
      pathname: url.pathname,
      headers: req.headers,
      body,
    }
    calls.push(recorded)

    const key = `${method} ${url.pathname}`
    const handler = handlers.get(key) ?? handlers.get(`${method} *`)
    if (!handler) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'mock_not_found', key }))
      return
    }

    const resolved = typeof handler === 'function' ? await handler(recorded) : handler
    const status = resolved.status ?? 200
    if ('json' in resolved) {
      const payload = JSON.stringify(resolved.json)
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(payload)
      return
    }
    res.writeHead(status, { 'content-type': 'text/plain' })
    res.end(resolved.text)
  })

  return {
    calls,
    on(method: string, pathname: string, response: MockResponse) {
      handlers.set(`${method.toUpperCase()} ${pathname}`, response)
    },
    onAny(method: string, response: MockResponse) {
      handlers.set(`${method.toUpperCase()} *`, response)
    },
    async listen() {
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
      const addr = server.address()
      if (!addr || typeof addr !== 'object') throw new Error('mock http bind failed')
      return {
        base: `http://127.0.0.1:${addr.port}`,
        port: addr.port,
        async close() {
          await new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()))
          })
        },
      }
    },
  }
}

/** Testlerde kullanılan örnek kimlik bilgileri (gerçek değil). */
export const SAMPLE_CREDENTIALS = {
  telegramToken: '123456:AASampleTelegramBotToken_ForTestsOnly',
  metaPageToken: 'EAASampleMetaPageAccessTokenForTests',
  metaPageId: 'sample-page-id',
  metaVerifyToken: 'sample-verify-token',
  lineChannelToken: 'SampleLineChannelAccessToken',
  lineChannelSecret: 'sample_line_channel_secret_0123456789',
  shopifyToken: 'shpat_sampleShopifyAdminToken',
  shopifyShop: 'sample-store.myshopify.com',
  wooKeySecret: 'ck_sample:cs_sample',
  trendyolKey: 'ty_sample_key',
  trendyolSecret: 'ty_sample_secret',
  trendyolSellerId: '123456',
  genericBearer: 'sample-bearer-token-0001',
  rcsToken: 'sample-rcs-service-account-token',
  wechatToken: 'sample-wechat-access-token',
  webchatToken: 'sample-webchat-relay-token',
} as const
