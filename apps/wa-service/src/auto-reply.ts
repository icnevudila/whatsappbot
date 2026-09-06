import { query } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'

type RuleRow = {
  id: string
  match_mode: 'contains' | 'equals' | 'regex' | 'any'
  match_pattern: string
  reply_body: string
  cooldown_seconds: number
  priority: number
}

function matchesRule(body: string, rule: RuleRow): boolean {
  const text = body.trim()
  const pattern = rule.match_pattern.trim()

  switch (rule.match_mode) {
    case 'any':
      return text.length > 0
    case 'equals':
      return text.toLocaleLowerCase('tr-TR') === pattern.toLocaleLowerCase('tr-TR')
    case 'contains':
      if (!pattern) return false
      return text.toLocaleLowerCase('tr-TR').includes(pattern.toLocaleLowerCase('tr-TR'))
    case 'regex': {
      if (!pattern) return false
      try {
        return new RegExp(pattern, 'iu').test(text)
      } catch {
        logger.warn({ ruleId: rule.id, pattern }, 'auto-reply: gecersiz regex')
        return false
      }
    }
    default:
      return false
  }
}

/**
 * Gelen metne kural uygula ve message.send job yaz.
 * Cift guvenlik: env.autoReplyEnabled + organizations.auto_reply_enabled.
 * Ikisi de true olmadan hicbir sey gondermez (su an varsayilan kapali).
 */
export async function maybeEnqueueAutoReply(options: {
  orgId: string
  createdBy: string
  accountId: string
  phoneE164: string | null
  body: string | null
}): Promise<void> {
  if (!env.autoReplyEnabled) return

  const { orgId, createdBy, accountId, phoneE164, body } = options
  if (!phoneE164 || !body?.trim()) return

  const orgRows = await query<{ auto_reply_enabled: boolean }>(
    `select auto_reply_enabled from public.organizations where id = $1 limit 1`,
    [orgId],
  )
  if (!orgRows[0]?.auto_reply_enabled) return

  const rules = await query<RuleRow>(
    `select id, match_mode, match_pattern, reply_body, cooldown_seconds, priority
       from public.auto_reply_rules
      where org_id = $1 and enabled = true
      order by priority asc, created_at asc
      limit 50`,
    [orgId],
  )
  if (rules.length === 0) return

  const rule = rules.find((row) => matchesRule(body, row))
  if (!rule) return

  if (rule.cooldown_seconds > 0) {
    const recent = await query<{ id: string }>(
      `select id::text from public.auto_reply_log
        where org_id = $1 and rule_id = $2 and phone_e164 = $3
          and created_at > now() - make_interval(secs => $4)
        limit 1`,
      [orgId, rule.id, phoneE164, rule.cooldown_seconds],
    )
    if (recent.length > 0) {
      logger.debug({ orgId, phoneE164, ruleId: rule.id }, 'auto-reply: cooldown')
      return
    }
  }

  const reply = rule.reply_body.trim()
  if (!reply) return

  await query(
    `insert into public.jobs (org_id, created_by, type, payload, account_id, priority, status)
     values ($1, $2, 'message.send', $3::jsonb, $4, 8, 'pending')`,
    [
      orgId,
      createdBy,
      JSON.stringify({ phone_e164: phoneE164, body: reply, source: 'auto_reply', rule_id: rule.id }),
      accountId,
    ],
  )

  await query(
    `insert into public.auto_reply_log (org_id, rule_id, phone_e164, account_id)
     values ($1, $2, $3, $4)`,
    [orgId, rule.id, phoneE164, accountId],
  )

  logger.info({ orgId, accountId, phoneE164, ruleId: rule.id }, 'auto-reply: job kuyruga alindi')
}
