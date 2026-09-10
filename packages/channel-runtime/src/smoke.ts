import type http from 'node:http'

export async function withTempServer(
  app: {
    listen(port: number, host?: string): Promise<void>
    close(): Promise<void>
    server: http.Server
  },
  fn: (base: string) => Promise<void>,
): Promise<void> {
  await app.listen(0, '127.0.0.1')
  const addr = app.server.address()
  if (!addr || typeof addr !== 'object') {
    throw new Error('server has no bound address')
  }
  const base = `http://127.0.0.1:${addr.port}`
  try {
    await fn(base)
  } finally {
    await app.close()
  }
}
