import { logger } from './logger.js'

/** Panel /api/push/notify — soft fail if unset. */
export async function dispatchPush(input: {
  orgId: string
  title: string
  body: string
  path?: string
}): Promise<void> {
  const base = process.env.PANEL_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const secret = process.env.PUSH_DISPATCH_SECRET?.trim()
  if (!base || !secret) return

  const url = `${base.replace(/\/$/, '')}/api/push/notify`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        orgId: input.orgId,
        title: input.title,
        body: input.body,
        path: input.path,
      }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      logger.debug({ status: res.status }, 'Push dispatch başarısız')
    }
  } catch (error) {
    logger.debug({ err: error }, 'Push dispatch atlandı')
  }
}
