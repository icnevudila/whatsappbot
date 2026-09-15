import { query } from './db.js'
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
 * Gelen mesaja otomatik yanıt uygula:
 * 1. Eğer eşleşen statik kural varsa kural yanıtı gönderilir.
 * 2. Eğer statik kural yoksa ve organizations.auto_reply_enabled true ise:
 *    ChatGPT üzerinden akıllı kurumsal yanıt üretilip gönderilir.
 */
export async function maybeEnqueueAutoReply(options: {
  orgId: string
  createdBy: string
  accountId: string
  phoneE164: string | null
  body: string | null
}): Promise<void> {
  const { orgId, createdBy, accountId, phoneE164, body } = options
  if (!phoneE164 || !body?.trim()) return

  const orgRows = await query<{ auto_reply_enabled: boolean; name: string }>(
    `select auto_reply_enabled, name from public.organizations where id = $1 limit 1`,
    [orgId],
  )
  const org = orgRows[0]
  if (!org?.auto_reply_enabled) return

  // 1. Önce statik kuralları kontrol et
  const rules = await query<RuleRow>(
    `select id, match_mode, match_pattern, reply_body, cooldown_seconds, priority
       from public.auto_reply_rules
      where org_id = $1 and enabled = true
      order by priority asc, created_at asc
      limit 50`,
    [orgId],
  )

  const rule = rules.find((row) => matchesRule(body, row))
  if (rule) {
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
        JSON.stringify({ phone_e164: phoneE164, body: reply, source: 'rule_auto_reply', rule_id: rule.id }),
        accountId,
      ],
    )

    await query(
      `insert into public.auto_reply_log (org_id, rule_id, phone_e164, account_id, source, reply_body)
       values ($1, $2, $3, $4, 'rule', $5)`,
      [orgId, rule.id, phoneE164, accountId, reply],
    )

    logger.info({ orgId, accountId, phoneE164, ruleId: rule.id }, 'auto-reply: kural yaniti kuyruga alindi')
    return
  }

  // 2. Statik kural yoksa: ChatGPT ile Yapay Zeka Otomatik Yanıtı (AI Auto-Reply)
  // Spam / sonsuz döngü koruması: Aynı numaraya 10 dakika içinde 1'den fazla otomatik yanıt gönderme
  const recentAi = await query<{ id: string }>(
    `select id::text from public.auto_reply_log
      where org_id = $1 and phone_e164 = $2
        and created_at > now() - interval '10 minutes'
      limit 1`,
    [orgId, phoneE164],
  )
  if (recentAi.length > 0) {
    logger.debug({ orgId, phoneE164 }, 'auto-reply: AI cooldown devrede')
    return
  }

  // İşletme bağlamı topla
  const [kitRows, productRows] = await Promise.all([
    query<{ name: string; tone: string }>(
      `select name, tone from public.brand_kits where org_id = $1 and is_default = true limit 1`,
      [orgId],
    ),
    query<{ name: string }>(
      `select name from public.org_products where org_id = $1 and is_active = true limit 5`,
      [orgId],
    ),
  ])

  let companyContext = org.name
  if (productRows.length > 0) {
    companyContext += `. Urunler: ${productRows.map((p) => p.name).join(', ')}`
  }
  const tone = kitRows[0]?.tone || 'Kurumsal, nazik ve yardimsever'

  const gatewayUrl = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')
  try {
    const aiRes = await fetch(`${gatewayUrl}/v1/chat/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: org.name,
        incomingMessage: body,
        companyContext,
        tone,
      }),
      signal: AbortSignal.timeout(35000),
    })

    if (!aiRes.ok) {
      logger.warn({ status: aiRes.status, orgId }, 'auto-reply: AI gateway yanit vermedi')
      return
    }

    const aiData = (await aiRes.json()) as {
      success?: boolean
      suggestions?: Array<{ label: string; text: string }>
    }

    if (!aiData.suggestions || aiData.suggestions.length === 0) return

    const selected =
      aiData.suggestions.find((s) => s.label.toLowerCase().includes('kısa') || s.label.toLowerCase().includes('kisa')) ||
      aiData.suggestions[0]

    if (!selected?.text) return
    const replyText = selected.text.trim()
    if (!replyText) return

    await query(
      `insert into public.jobs (org_id, created_by, type, payload, account_id, priority, status)
       values ($1, $2, 'message.send', $3::jsonb, $4, 8, 'pending')`,
      [
        orgId,
        createdBy,
        JSON.stringify({ phone_e164: phoneE164, body: replyText, source: 'ai_auto_reply' }),
        accountId,
      ],
    )

    await query(
      `insert into public.auto_reply_log (org_id, phone_e164, account_id, source, reply_body)
       values ($1, $2, $3, 'ai', $4)`,
      [orgId, phoneE164, accountId, replyText],
    )

    logger.info({ orgId, accountId, phoneE164, label: selected.label }, 'auto-reply: AI yaniti kuyruga alindi')
  } catch (err: unknown) {
    logger.warn({ err: err instanceof Error ? err.message : err, orgId }, 'auto-reply: AI uretim hatasi')
  }
}
