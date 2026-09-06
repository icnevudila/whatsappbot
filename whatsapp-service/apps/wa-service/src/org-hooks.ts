import { one, query } from './db.js'
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

/** Son N sn icinde ayni telefona outbound var mi (auto-reply cooldown). */
export async function recentOutboundExists(
  orgId: string,
  phone: string,
  withinSeconds: number,
): Promise<boolean> {
  if (withinSeconds <= 0) return false
  const row = await one<{ n: string }>(
    `select count(*)::text as n
       from public.message_log
      where org_id = $1
        and phone_e164 = $2
        and direction = 'out'
        and created_at > now() - make_interval(secs => $3)`,
    [orgId, phone, withinSeconds],
  )
  return Number(row?.n ?? 0) > 0
}

export type AutoReplyRule = {
  id: string
  match_mode: string
  match_pattern: string
  reply_body: string
  cooldown_seconds: number
}

export async function findMatchingAutoReply(
  orgId: string,
  inboundBody: string | null,
): Promise<AutoReplyRule | null> {
  const rules = await query<AutoReplyRule>(
    `select id::text, match_mode, match_pattern, reply_body, cooldown_seconds
       from public.auto_reply_rules
      where org_id = $1 and enabled
      order by priority asc, created_at asc`,
    [orgId],
  )

  const text = (inboundBody ?? '').trim()
  for (const rule of rules) {
    if (rule.match_mode === 'any') return rule
    if (!text) continue
    const pat = rule.match_pattern
    if (rule.match_mode === 'equals' && text.toLowerCase() === pat.toLowerCase()) return rule
    if (rule.match_mode === 'contains' && text.toLowerCase().includes(pat.toLowerCase())) {
      return rule
    }
    if (rule.match_mode === 'regex') {
      try {
        if (new RegExp(pat, 'i').test(text)) return rule
      } catch {
        continue
      }
    }
  }
  return null
}
