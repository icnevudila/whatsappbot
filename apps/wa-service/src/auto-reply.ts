import { createHash } from 'node:crypto'
import type { WASocket } from '@whiskeysockets/baileys'
import { query } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { buildKnowledgeContext } from './product-knowledge.js'

type RuleRow = {
  id: string
  match_mode: 'contains' | 'equals' | 'regex' | 'any'
  match_pattern: string
  reply_body: string
  cooldown_seconds: number
  priority: number
}

type Suggestion = {
  label: string
  text: string
}

function normalizeForLibrary(input: string): string {
  return input
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
}

function fingerprint(input: string): string {
  return createHash('sha256').update(normalizeForLibrary(input)).digest('hex')
}

function shouldHistoryAffectCache(message: string): boolean {
  const normalized = normalizeForLibrary(message)
  if (normalized.length < 18) return true
  return /\b(o|onu|bunu|şunu|su|bu|evet|hayır|hayir|tamam|peki|olur|kaç|kac)\b/u.test(normalized)
}

function validSuggestions(value: unknown): value is Suggestion[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as Suggestion).label === 'string' &&
        typeof (item as Suggestion).text === 'string' &&
        (item as Suggestion).text.trim().length > 0,
    )
  )
}

function selectAutoReplySuggestion(suggestions: Suggestion[]): Suggestion | null {
  return (
    suggestions.find((s) => s.label.toLocaleLowerCase('tr-TR').includes('kısa')) ||
    suggestions.find((s) => s.label.toLocaleLowerCase('tr-TR').includes('kisa')) ||
    suggestions[0] ||
    null
  )
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

async function enqueueAiAutoReply(options: {
  orgId: string
  createdBy: string
  accountId: string
  phoneE164: string
  replyText: string
  source: 'library' | 'generated'
  label?: string
}) {
  const replyText = options.replyText.trim()
  if (!replyText) return

  await query(
    `insert into public.jobs (org_id, created_by, type, payload, account_id, priority, status)
     values ($1, $2, 'message.send', $3::jsonb, $4, 8, 'pending')`,
    [
      options.orgId,
      options.createdBy,
      JSON.stringify({
        phone_e164: options.phoneE164,
        body: replyText,
        source: options.source === 'library' ? 'ai_auto_reply_library' : 'ai_auto_reply',
      }),
      options.accountId,
    ],
  )

  await query(
    `insert into public.auto_reply_log (org_id, phone_e164, account_id, source, reply_body)
     values ($1, $2, $3, 'ai', $4)`,
    [options.orgId, options.phoneE164, options.accountId, replyText],
  )

  logger.info(
    { orgId: options.orgId, accountId: options.accountId, phoneE164: options.phoneE164, label: options.label, source: options.source },
    'auto-reply: AI yaniti kuyruga alindi',
  )
}

export type AutoReplyOptions = {
  orgId: string
  createdBy: string
  accountId: string
  phoneE164: string | null
  body: string | null
  remoteJid?: string | null
  sock?: WASocket | null
  skipDebounce?: boolean
}

interface BufferedSession {
  orgId: string
  createdBy: string
  accountId: string
  phoneE164: string
  remoteJid?: string | null
  sock?: WASocket | null
  messages: string[]
  firstReceivedAt: number
  debounceTimer: NodeJS.Timeout
  maxWaitTimer: NodeJS.Timeout
}

const debounceMap = new Map<string, BufferedSession>()

export function getActiveDebounceBufferCount(): number {
  return debounceMap.size
}

export function clearAutoReplyBuffers(): void {
  for (const session of debounceMap.values()) {
    clearTimeout(session.debounceTimer)
    clearTimeout(session.maxWaitTimer)
  }
  debounceMap.clear()
}

export function flushAllAutoReplyBuffers(): void {
  for (const key of Array.from(debounceMap.keys())) {
    void flushDebounceBuffer(key)
  }
}

async function flushDebounceBuffer(key: string): Promise<void> {
  const session = debounceMap.get(key)
  if (!session) return

  debounceMap.delete(key)
  clearTimeout(session.debounceTimer)
  clearTimeout(session.maxWaitTimer)

  const combinedBody = session.messages.join('\n').trim()
  if (!combinedBody) return

  logger.info(
    {
      key,
      phoneE164: session.phoneE164,
      partsCount: session.messages.length,
      combinedPreview: combinedBody.slice(0, 100),
    },
    'auto-reply: tampon bosaltildi, birlestirilmis mesaj isleniyor',
  )

  // WhatsApp 'yazıyor...' (composing) varlık bildirimi
  if (session.sock && session.remoteJid) {
    try {
      void session.sock.sendPresenceUpdate('composing', session.remoteJid).catch(() => {})
    } catch {
      // presence hatasi oto-cevabi kesmemeli
    }
  }

  await processAutoReply({
    orgId: session.orgId,
    createdBy: session.createdBy,
    accountId: session.accountId,
    phoneE164: session.phoneE164,
    remoteJid: session.remoteJid,
    sock: session.sock,
    body: combinedBody,
    skipDebounce: true,
  })
}

/**
 * Gelen mesaja otomatik yanıt uygula:
 * 1. Peş peşe gelen kısa mesajları (debounceMs penceresinde) birleştirir.
 * 2. Eşleşen statik kural varsa kural yanıtı gönderilir.
 * 3. Eşleşen statik kural yoksa ve organizations.auto_reply_enabled true ise:
 *    ChatGPT üzerinden akıllı kurumsal yanıt üretilip gönderilir.
 */
export async function maybeEnqueueAutoReply(options: AutoReplyOptions): Promise<void> {
  const { orgId, createdBy, accountId, phoneE164, body, skipDebounce } = options
  if (!phoneE164 || !body?.trim()) return

  // Org bazlı oto-cevap açık mı?
  const orgRows = await query<{ auto_reply_enabled: boolean; name: string }>(
    `select auto_reply_enabled, name from public.organizations where id = $1 limit 1`,
    [orgId],
  )
  const org = orgRows[0]
  if (!org?.auto_reply_enabled) return

  // Debounce atlanacaksa doğrudan işle (örn. testler veya tekil akışlar)
  if (skipDebounce || env.autoReplyDebounceMs <= 0) {
    await processAutoReply(options)
    return
  }

  const bufferKey = `${orgId}:${accountId}:${phoneE164}`
  const existing = debounceMap.get(bufferKey)

  if (existing) {
    clearTimeout(existing.debounceTimer)
    existing.messages.push(body.trim())
    if (options.sock) existing.sock = options.sock
    if (options.remoteJid) existing.remoteJid = options.remoteJid

    existing.debounceTimer = setTimeout(() => {
      void flushDebounceBuffer(bufferKey).catch((err) => {
        logger.error({ err, bufferKey }, 'auto-reply: buffer flush hatasi')
      })
    }, env.autoReplyDebounceMs)

    logger.info(
      {
        bufferKey,
        phoneE164,
        totalParts: existing.messages.length,
        debounceMs: env.autoReplyDebounceMs,
      },
      'auto-reply: yeni mesaj tampona eklendi, bekleme suresi sifirlandi',
    )
    return
  }

  const session: BufferedSession = {
    orgId,
    createdBy,
    accountId,
    phoneE164,
    remoteJid: options.remoteJid ?? null,
    sock: options.sock ?? null,
    messages: [body.trim()],
    firstReceivedAt: Date.now(),
    debounceTimer: setTimeout(() => {
      void flushDebounceBuffer(bufferKey).catch((err) => {
        logger.error({ err, bufferKey }, 'auto-reply: buffer flush hatasi')
      })
    }, env.autoReplyDebounceMs),
    maxWaitTimer: setTimeout(() => {
      void flushDebounceBuffer(bufferKey).catch((err) => {
        logger.error({ err, bufferKey }, 'auto-reply: buffer maxWait flush hatasi')
      })
    }, env.autoReplyMaxWaitMs),
  }

  debounceMap.set(bufferKey, session)
  logger.info(
    {
      bufferKey,
      phoneE164,
      debounceMs: env.autoReplyDebounceMs,
      maxWaitMs: env.autoReplyMaxWaitMs,
    },
    'auto-reply: yeni mesaj tamponu baslatildi',
  )
}

async function processAutoReply(options: AutoReplyOptions): Promise<void> {
  const { orgId, createdBy, accountId, phoneE164, body, sock, remoteJid } = options
  if (!phoneE164 || !body?.trim()) return

  try {
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
  // Spam / sonsuz döngü koruması: kısa süre içinde aynı numaraya tekrar AI yanıtı gönderme.
  if (env.aiAutoReplyCooldownSeconds > 0) {
    const recentAi = await query<{ id: string }>(
      `select id::text from public.auto_reply_log
        where org_id = $1 and phone_e164 = $2
          and source = 'ai'
          and created_at > now() - make_interval(secs => $3)
        limit 1`,
      [orgId, phoneE164, env.aiAutoReplyCooldownSeconds],
    )
    if (recentAi.length > 0) {
      logger.debug(
        { orgId, phoneE164, cooldownSeconds: env.aiAutoReplyCooldownSeconds },
        'auto-reply: AI cooldown devrede',
      )
      return
    }
  }

  // İşletme bağlamı topla
  const [kitRows, productRows] = await Promise.all([
    query<{ name: string; tone: string }>(
      `select name, tone from public.brand_kits where org_id = $1 and is_default = true limit 1`,
      [orgId],
    ),
    query<{ name: string }>(
      `select name from public.org_products where org_id = $1 and is_active = true limit 6`,
      [orgId],
    ),
  ])

  let companyContext = org.name
  if (kitRows[0]?.name && kitRows[0].name !== org.name) {
    companyContext += ` (${kitRows[0].name})`
  }
  if (productRows.length > 0) {
    companyContext += `. Ürünler/Hizmetler: ${productRows.map((p) => p.name).join(', ')}`
  }
  const knowledgeContext = await buildKnowledgeContext({ orgId, phoneE164, message: body })
  if (knowledgeContext) {
    companyContext += `\n${knowledgeContext}`
  }
  const tone = kitRows[0]?.tone || 'Kurumsal, nazik, yardımsever ve samimi'
  const historyForCache = shouldHistoryAffectCache(body) ? '' : ''
  const messageFingerprint = fingerprint(body)
  const contextFingerprint = fingerprint(`${companyContext}\n${tone}\n${historyForCache}`)

  const cachedRows = await query<{ id: string; suggestions: unknown; hit_count: number }>(
    `select id::text, suggestions, hit_count
       from public.ai_reply_suggestion_library
      where org_id = $1
        and message_fingerprint = $2
        and context_fingerprint = $3
      limit 1`,
    [orgId, messageFingerprint, contextFingerprint],
  )
  const cached = cachedRows[0]
  if (cached && validSuggestions(cached.suggestions)) {
    const selected = selectAutoReplySuggestion(cached.suggestions)
    const replyText = selected?.text.trim()
    if (replyText) {
      await query(
        `update public.ai_reply_suggestion_library
            set hit_count = hit_count + 1,
                last_used_at = now(),
                updated_at = now()
          where id = $1`,
        [cached.id],
      )
      await enqueueAiAutoReply({
        orgId,
        createdBy,
        accountId,
        phoneE164,
        replyText,
        source: 'library',
        label: selected?.label,
      })
      return
    }
  }

  let gatewayUrl = process.env.OMNISTUDIO_GATEWAY_URL || 'http://omnistudio-engine:3456'
  if (gatewayUrl.includes('127.0.0.1') || gatewayUrl.includes('localhost')) {
    gatewayUrl = 'http://omnistudio-engine:3456'
  }
  gatewayUrl = gatewayUrl.replace(/\/$/, '')
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
      suggestions?: Suggestion[]
    }

    if (!validSuggestions(aiData.suggestions)) return

    await query(
      `insert into public.ai_reply_suggestion_library (
        org_id, message_fingerprint, context_fingerprint, incoming_sample,
        suggestions, source, generated_count, last_used_at, updated_at
      )
      values ($1, $2, $3, $4, $5::jsonb, 'chatgpt', 1, now(), now())
      on conflict (org_id, message_fingerprint, context_fingerprint)
      do update set
        suggestions = excluded.suggestions,
        incoming_sample = excluded.incoming_sample,
        generated_count = public.ai_reply_suggestion_library.generated_count + 1,
        last_used_at = now(),
        updated_at = now()`,
      [orgId, messageFingerprint, contextFingerprint, body.slice(0, 500), JSON.stringify(aiData.suggestions)],
    )

    const selected = selectAutoReplySuggestion(aiData.suggestions)

    if (!selected?.text) return
    const replyText = selected.text.trim()
    if (!replyText) return

    await enqueueAiAutoReply({
      orgId,
      createdBy,
      accountId,
      phoneE164,
      replyText,
      source: 'generated',
      label: selected.label,
    })
    } catch (err: unknown) {
      logger.warn({ err: err instanceof Error ? err.message : err, orgId }, 'auto-reply: AI uretim hatasi')
    }
  } finally {
    if (sock && remoteJid) {
      try {
        void sock.sendPresenceUpdate('paused', remoteJid).catch(() => {})
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Gelen mesaj icin arka planda AI cevap onerilerini onceden uretir ve
 * ai_reply_suggestion_library tablosuna kaydeder.
 * MUSTERIYE ASLA MESAJ GONDERMEZ (oto-cevap pasif kalir).
 * Temsilci paneli actiginda oneriler aninda hazir olur.
 */
export async function pregenerateAiSuggestions(options: {
  orgId: string
  phoneE164: string | null
  body: string
}): Promise<void> {
  const { orgId, phoneE164, body } = options
  const trimmed = body?.trim()
  if (!trimmed || trimmed.length < 2) return

  try {
    const messageFingerprint = fingerprint(trimmed)

    // Onceden bu mesaj icin oneriler uretilmis mi?
    const existing = await query<{ id: string }>(
      `select id::text from public.ai_reply_suggestion_library
        where org_id = $1 and message_fingerprint = $2
        limit 1`,
      [orgId, messageFingerprint],
    )
    if (existing.length > 0) return

    const [orgRows, kitRows, productRows] = await Promise.all([
      query<{ name: string }>(
        `select name from public.organizations where id = $1 limit 1`,
        [orgId],
      ),
      query<{ name: string | null; tone: string | null }>(
        `select name, tone from public.reply_sales_kit where org_id = $1 limit 1`,
        [orgId],
      ),
      query<{ name: string }>(
        `select name from public.org_products where org_id = $1 and is_active = true limit 6`,
        [orgId],
      ),
    ])

    const org = orgRows[0]
    if (!org) return

    let companyContext = org.name
    if (kitRows[0]?.name && kitRows[0].name !== org.name) {
      companyContext += ` (${kitRows[0].name})`
    }
    if (productRows.length > 0) {
      companyContext += `. Ürünler/Hizmetler: ${productRows.map((p) => p.name).join(', ')}`
    }
    const knowledgeContext = await buildKnowledgeContext({ orgId, phoneE164, message: trimmed })
    if (knowledgeContext) {
      companyContext += `\n${knowledgeContext}`
    }
    const tone = kitRows[0]?.tone || 'Kurumsal, nazik, yardımsever ve samimi'
    const contextFingerprint = fingerprint(`${companyContext}\n${tone}\n`)

    let gatewayUrl = process.env.OMNISTUDIO_GATEWAY_URL || 'http://omnistudio-engine:3456'
    if (gatewayUrl.includes('127.0.0.1') || gatewayUrl.includes('localhost')) {
      gatewayUrl = 'http://omnistudio-engine:3456'
    }
    gatewayUrl = gatewayUrl.replace(/\/$/, '')

    const aiRes = await fetch(`${gatewayUrl}/v1/chat/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: org.name,
        incomingMessage: trimmed,
        companyContext,
        tone,
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!aiRes.ok) {
      logger.debug({ status: aiRes.status, orgId }, 'pregenerateAiSuggestions: gateway yanit vermedi')
      return
    }

    const aiData = (await aiRes.json()) as {
      success?: boolean
      suggestions?: Suggestion[]
    }

    if (!validSuggestions(aiData.suggestions)) return

    await query(
      `insert into public.ai_reply_suggestion_library (
        org_id, message_fingerprint, context_fingerprint, incoming_sample,
        suggestions, source, generated_count, last_used_at, updated_at
      )
      values ($1, $2, $3, $4, $5::jsonb, 'chatgpt', 1, now(), now())
      on conflict (org_id, message_fingerprint, context_fingerprint)
      do update set
        suggestions = excluded.suggestions,
        incoming_sample = excluded.incoming_sample,
        updated_at = now()`,
      [orgId, messageFingerprint, contextFingerprint, trimmed.slice(0, 500), JSON.stringify(aiData.suggestions)],
    )

    logger.info(
      { orgId, phoneE164, count: aiData.suggestions.length },
      'AI yanit onerileri onceden uretildi ve kutuphaneye kaydedildi',
    )
  } catch (err) {
    logger.debug({ err: err instanceof Error ? err.message : err, orgId }, 'pregenerateAiSuggestions atlandi')
  }
}
