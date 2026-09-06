import { one } from './db.js'
import { logger } from './logger.js'

const log = logger.child({ scope: 'crm-webhook' })

export async function emitOrgWebhook(
  orgId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const row = await one<{ webhook_url: string | null; webhook_secret: string | null }>(
    `select webhook_url, webhook_secret from public.organizations where id = $1`,
    [orgId],
  )
  if (!row?.webhook_url) return

  const body = JSON.stringify({
    event,
    org_id: orgId,
    at: new Date().toISOString(),
    data: payload,
  })

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'filo-wa-service/webhook',
  }
  if (row.webhook_secret) {
    headers['x-filo-secret'] = row.webhook_secret
  }

  try {
    const res = await fetch(row.webhook_url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      log.warn({ orgId, event, status: res.status }, 'CRM webhook basarisiz')
    }
  } catch (error) {
    log.warn({ err: error, orgId, event }, 'CRM webhook hata')
  }
}
