import { createHash } from 'node:crypto'
import type { WASocket } from '@whiskeysockets/baileys'
import { query } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { isWithinSendWindow } from '@wa/shared'
import { buildKnowledgeContext } from './product-knowledge.js'
import { fetchFromOmniStudio } from './omnistudio-client.js'

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

function extractSemanticIntentKey(input: string): string | null {
  const norm = normalizeForLibrary(input)
  if (!norm) return null

  if (/\b(fiyat|fiyati|fiyatlar|fiyatlari|ucret|ucreti|kac\s*tl|kac\s*para|ne\s*kadar|maliyet|tarife)\b/u.test(norm)) {
    return 'intent:fiyat_sorgusu'
  }
  if (/\b(konum|adres|adresi|nerede|neredesiniz|yeriniz|yeriniz\s*nerede|harita|tarifi|nasil\s*gelirim)\b/u.test(norm)) {
    return 'intent:konum_adres'
  }
  if (/\b(var\s*mi|elinizde\s*var\s*mi|stok|stokta|stokta\s*var\s*mi|temin|mevcut\s*mu|bulunur\s*mu)\b/u.test(norm)) {
    return 'intent:stok_temin'
  }
  if (/\b(kargo|kargoya|teslimat|ne\s*zaman\s*gelir|kac\s*gunde|kargom|takip)\b/u.test(norm)) {
    return 'intent:kargo_teslimat'
  }
  if (/\b(merhaba|selam|selamlar|gunaydin|iyi\s*gunler|kolay\s*gelsin|iyi\s*calismalar|iyi\s*aksamlar)\b/u.test(norm)) {
    return 'intent:selamlasma'
  }
  return null
}

export function generateSmartSuggestions(
  incoming: string,
  companyName: string,
  productsList?: string,
  tone?: string,
): Suggestion[] {
  const norm = (incoming || '').toLowerCase()
  const comp = companyName || 'işletmemiz'

  // Fiyat / Maliyet
  if (
    norm.includes('fiyat') ||
    norm.includes('ne kadar') ||
    norm.includes('ücret') ||
    norm.includes('ucret') ||
    norm.includes('kac') ||
    norm.includes('kaç') ||
    norm.includes('maliyet')
  ) {
    const productNote = productsList ? ` (${productsList.split(',')[0]} ve modellerimiz)` : ''
    return [
      {
        label: 'Kısa & Net',
        text: `Merhabalar, ilgilendiğiniz ürün veya hizmet detayını iletirseniz${productNote} hemen güncel fiyat bilgisi paylaşalım.`,
      },
      {
        label: 'Samimi',
        text: `Merhabalar, memnuniyetle yardımcı oluruz! Tam olarak hangi model veya ürünümüzün fiyatını öğrenmek istemiştiniz?`,
      },
      {
        label: 'Yönlendirici',
        text: `Merhaba, güncel fiyat listemizi ve kampanyalı tekliflerimizi iletebilmemiz için ilgilendiğiniz ürün adını veya miktarını paylaşabilir misiniz?`,
      },
    ]
  }

  // Konum / Adres
  if (
    norm.includes('konum') ||
    norm.includes('nerede') ||
    norm.includes('adres') ||
    norm.includes('yeriniz') ||
    norm.includes('tarifi')
  ) {
    return [
      {
        label: 'Kısa & Net',
        text: 'İşletmemiz Mamak, Ankara adresindedir. WhatsApp üzerinden harita konumumuzu hemen iletiyoruz.',
      },
      {
        label: 'Samimi',
        text: "Merhabalar, yerimiz Mamak / Ankara'da bulunuyor. Dilerseniz hemen canlı navigasyon pini gönderebilirim.",
      },
      {
        label: 'Yönlendirici',
        text: 'Merhaba, Mamak Ankara adresindeyiz. Ziyaretinizden memnuniyet duyarız; doğrudan konum pini gönderelim mi?',
      },
    ]
  }

  // Stok / Ürün Temin
  if (
    norm.includes('var mi') ||
    norm.includes('var mı') ||
    norm.includes('stok') ||
    norm.includes('mevcut') ||
    norm.includes('temin')
  ) {
    return [
      {
        label: 'Kısa & Net',
        text: 'Merhabalar, ürünümüz stoklarımızda mevcuttur. Dilediğiniz adette hızlı gönderim sağlayabiliriz.',
      },
      {
        label: 'Samimi',
        text: 'Merhabalar, evet ürünümüz hazır stoklarımızda bulunuyor! İhtiyacınız olan adedi belirtirseniz hemen ayıralım.',
      },
      {
        label: 'Yönlendirici',
        text: 'Merhaba, stoklarımız düzenli güncellenmektedir. Sipariş vermek istediğiniz miktar ve teslimat bölgesini iletirseniz hemen kontrol edelim.',
      },
    ]
  }

  // Selamlaşma
  if (
    norm.includes('merhaba') ||
    norm.includes('selam') ||
    norm.includes('günaydın') ||
    norm.includes('gunaydin') ||
    norm.includes('iyi günler') ||
    norm.includes('kolay gelsin') ||
    norm.includes('iyi çalışmalar')
  ) {
    return [
      {
        label: 'Kısa & Net',
        text: `Merhabalar, ${comp} olarak hoş geldiniz. Size nasıl yardımcı olabiliriz?`,
      },
      {
        label: 'Samimi',
        text: 'Merhabalar, hoş geldiniz! Size yardımcı olmaktan mutluluk duyarız, nasıl bir konuda destek istersiniz?',
      },
      {
        label: 'Yönlendirici',
        text: 'İyi günler dileriz. Ürünlerimiz, siparişleriniz veya hizmetlerimiz hakkında detaylı bilgi almak için sorunuzu iletebilirsiniz.',
      },
    ]
  }

  // Genel / Diğer
  return [
    {
      label: 'Kısa & Net',
      text: `Mesajınız tarafımıza ulaştı. ${comp} olarak talebinizle ilgili en kısa sürede detaylı bilgi veriyoruz.`,
    },
    {
      label: 'Samimi',
      text: 'Merhabalar, mesajınız için teşekkür ederiz. Konuyla ilgili kontrolü sağlayıp hemen size dönüş yapıyoruz.',
    },
    {
      label: 'Yönlendirici',
      text: 'Talebinizi aldık. Size daha hızlı yardımcı olabilmemiz için ürün adı, görsel veya sipariş detayınızı iletebilir misiniz?',
    },
  ]
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
  remoteJid?: string | null
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
        recipient_jid: options.remoteJid?.endsWith('@lid') ? options.remoteJid : undefined,
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

type OrgSafetyConfig = {
  auto_reply_enabled: boolean
  name: string
  auto_reply_contact_policy?: string | null
  auto_reply_schedule?: string | null
  auto_reply_operator_silence_minutes?: number | null
  auto_reply_escalation_message?: string | null
  send_window_start?: string | null
  send_window_end?: string | null
}

const ESCALATION_REGEX =
  /\b(yetkili|temsilci|musteri temsilcisi|müşteri temsilcisi|canli destek|canlı destek|insan|insanla|operator|operatör|şikayet|sikayet|iptal)\b/iu

async function evaluateAutoReplySafety(options: {
  orgId: string
  accountId: string
  phoneE164: string
  body: string
  remoteJid?: string | null
}): Promise<{ allow: boolean; org?: OrgSafetyConfig; isEscalation?: boolean }> {
  const { orgId, accountId, phoneE164, body, remoteJid } = options

  const orgRows = await query<OrgSafetyConfig>(
    `select auto_reply_enabled, name,
            auto_reply_contact_policy, auto_reply_schedule,
            auto_reply_operator_silence_minutes, auto_reply_escalation_message,
            send_window_start, send_window_end
       from public.organizations where id = $1 limit 1`,
    [orgId],
  )
  const org = orgRows[0]
  if (!org?.auto_reply_enabled) {
    return { allow: false }
  }

  // 1. Mesai Saatleri / Zaman Çizelgesi Kontrolü
  const schedule = org.auto_reply_schedule || 'always'
  if (schedule === 'outside_hours') {
    const inSendWindow = isWithinSendWindow(new Date(), org.send_window_start, org.send_window_end)
    if (inSendWindow) {
      logger.debug({ orgId, phoneE164 }, 'auto-reply: mesai saatleri icinde, personel aktif, atlandi')
      return { allow: false, org }
    }
  } else if (schedule === 'working_hours') {
    const inSendWindow = isWithinSendWindow(new Date(), org.send_window_start, org.send_window_end)
    if (!inSendWindow) {
      logger.debug({ orgId, phoneE164 }, 'auto-reply: mesai saatleri disinda, atlandi')
      return { allow: false, org }
    }
  }

  // 2. Kişisel Rehber / Tanıdık Koruması (Contact Policy)
  const contactPolicy = org.auto_reply_contact_policy || 'unknown_only'
  if (contactPolicy === 'unknown_only') {
    const contacts = await query<{ name: string | null }>(
      `select name from public.account_contacts
        where account_id = $1 and phone_e164 = $2 and name is not null and trim(name) != ''
        limit 1`,
      [accountId, phoneE164],
    )
    if (contacts[0]?.name) {
      logger.info(
        { orgId, accountId, phoneE164, contactName: contacts[0].name },
        'auto-reply: rehberde kayitli kisi, kisisel temas korumasi devrede, atlandi',
      )
      return { allow: false, org }
    }
  }

  // 3. İnsan Operatör Müdahalesi / Sessizlik Penceresi
  const silenceMinutes = org.auto_reply_operator_silence_minutes ?? 30
  if (silenceMinutes > 0) {
    const recentHuman = await query<{ created_at: string }>(
      `select ml.created_at
         from public.message_log ml
        where ml.org_id = $1
          and ml.account_id = $2
          and (ml.phone_e164 = $3 or (ml.remote_jid is not null and ml.remote_jid = $4))
          and ml.direction = 'out'
          and ml.campaign_id is null
          and ml.created_at > now() - make_interval(mins => $5)
          and not exists (
            select 1 from public.auto_reply_log arl
             where arl.org_id = ml.org_id
               and arl.account_id = ml.account_id
               and arl.phone_e164 = $3
               and abs(extract(epoch from (arl.created_at - ml.created_at))) < 20
          )
        order by ml.created_at desc
        limit 1`,
      [orgId, accountId, phoneE164, remoteJid ?? null, silenceMinutes],
    )
    if (recentHuman.length > 0) {
      logger.info(
        { orgId, accountId, phoneE164, lastHumanAt: recentHuman[0]?.created_at },
        'auto-reply: insan operator devrede, oto-cevap susturuldu',
      )
      return { allow: false, org }
    }
  }

  // 4. Son 2 Saatte Yetkiliye Aktarılmış Müşteri Kontrolü
  const recentEscalation = await query<{ id: string }>(
    `select id::text from public.auto_reply_log
      where org_id = $1 and phone_e164 = $2 and source = 'escalation'
        and created_at > now() - interval '2 hours'
      limit 1`,
    [orgId, phoneE164],
  )
  if (recentEscalation.length > 0) {
    logger.debug({ orgId, phoneE164 }, 'auto-reply: son 2 saatte yetkiliye aktarilmis, susturuldu')
    return { allow: false, org }
  }

  // 5. Yetkili / Canlı Temsilci Talebi Tespiti
  if (ESCALATION_REGEX.test(body)) {
    return { allow: true, org, isEscalation: true }
  }

  return { allow: true, org, isEscalation: false }
}

/**
 * Gelen mesaja otomatik yanıt uygula:
 * 1. Güvenlik filtreleri (rehber koruması, operatör sessizliği, mesai saati, yetkili aktarımı).
 * 2. Peş peşe gelen kısa mesajları (debounceMs penceresinde) birleştirir.
 * 3. Eşleşen statik kural varsa kural yanıtı gönderilir.
 * 4. Eşleşen statik kural yoksa ve organizations.auto_reply_enabled true ise:
 *    ChatGPT üzerinden akıllı kurumsal yanıt üretilip gönderilir.
 */
export async function maybeEnqueueAutoReply(options: AutoReplyOptions): Promise<void> {
  const { orgId, createdBy, accountId, phoneE164, body, skipDebounce, remoteJid } = options
  if (!phoneE164 || !body?.trim()) return

  const safety = await evaluateAutoReplySafety({
    orgId,
    accountId,
    phoneE164,
    body,
    remoteJid,
  })
  if (!safety.allow || !safety.org) return

  // Yetkili talebi tespit edildiyse beklemeden anında aktarım mesajı gönder
  if (safety.isEscalation) {
    const escalationMsg =
      safety.org.auto_reply_escalation_message ||
      'Talebinizi aldık. Sizi müşteri temsilcimize aktarıyorum, en kısa sürede sizinle iletişime geçilecektir.'

    await query(
      `insert into public.jobs (org_id, created_by, type, payload, account_id, priority, status)
       values ($1, $2, 'message.send', $3::jsonb, $4, 8, 'pending')`,
      [
        orgId,
        createdBy,
        JSON.stringify({
          phone_e164: phoneE164,
          recipient_jid: remoteJid?.endsWith('@lid') ? remoteJid : undefined,
          body: escalationMsg,
          source: 'escalation_auto_reply',
        }),
        accountId,
      ],
    )

    await query(
      `insert into public.auto_reply_log (org_id, phone_e164, account_id, source, reply_body)
       values ($1, $2, $3, 'escalation', $4)`,
      [orgId, phoneE164, accountId, escalationMsg],
    )

    logger.info(
      { orgId, accountId, phoneE164 },
      'auto-reply: musteri yetkili talebinde bulundu, aktarim mesaji kuyruga alindi',
    )
    return
  }

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
    const safety = await evaluateAutoReplySafety({
      orgId,
      accountId,
      phoneE164,
      body,
      remoteJid,
    })
    if (!safety.allow || !safety.org) return

    if (safety.isEscalation) {
      const escalationMsg =
        safety.org.auto_reply_escalation_message ||
        'Talebinizi aldık. Sizi müşteri temsilcimize aktarıyorum, en kısa sürede sizinle iletişime geçilecektir.'

      await query(
        `insert into public.jobs (org_id, created_by, type, payload, account_id, priority, status)
         values ($1, $2, 'message.send', $3::jsonb, $4, 8, 'pending')`,
        [
          orgId,
          createdBy,
          JSON.stringify({
            phone_e164: phoneE164,
            recipient_jid: remoteJid?.endsWith('@lid') ? remoteJid : undefined,
            body: escalationMsg,
            source: 'escalation_auto_reply',
          }),
          accountId,
        ],
      )

      await query(
        `insert into public.auto_reply_log (org_id, phone_e164, account_id, source, reply_body)
         values ($1, $2, $3, 'escalation', $4)`,
        [orgId, phoneE164, accountId, escalationMsg],
      )
      return
    }

    const org = safety.org

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
        JSON.stringify({
          phone_e164: phoneE164,
          recipient_jid: remoteJid?.endsWith('@lid') ? remoteJid : undefined,
          body: reply,
          source: 'rule_auto_reply',
          rule_id: rule.id,
        }),
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
      `select name, tone from public.brand_kits where org_id = $1 order by is_default desc nulls last limit 1`,
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
        remoteJid,
        replyText,
        source: 'library',
        label: selected?.label,
      })
      return
    }
  }

  try {
    const aiRes = await fetchFromOmniStudio('/v1/chat/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: org.name,
        incomingMessage: body,
        companyContext,
        tone,
      }),
      signal: AbortSignal.timeout(50000),
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
      remoteJid,
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
    const semanticIntent = extractSemanticIntentKey(trimmed)

    // Onceden bu mesaj icin veya ayni niyet icin oneriler uretilmis mi?
    const existing = await query<{ id: string }>(
      `select id::text from public.ai_reply_suggestion_library
        where org_id = $1 and (message_fingerprint = $2 or ($3::text is not null and message_fingerprint = $3))
        limit 1`,
      [orgId, messageFingerprint, semanticIntent ? fingerprint(semanticIntent) : null],
    )
    if (existing.length > 0) return

    const [orgRows, kitRows, productRows] = await Promise.all([
      query<{ name: string }>(
        `select name from public.organizations where id = $1 limit 1`,
        [orgId],
      ),
      query<{ name: string | null; tone: string | null }>(
        `select name, tone from public.brand_kits where org_id = $1 order by is_default desc nulls last limit 1`,
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
    let conversationHistory = ''
    if (phoneE164) {
      try {
        const recentLogs = await query<{ direction: string; body: string }>(
          `select direction, body from public.message_log
            where org_id = $1 and phone_e164 = $2
            order by created_at desc
            limit 6`,
          [orgId, phoneE164],
        )
        if (recentLogs.length > 0) {
          conversationHistory = recentLogs
            .reverse()
            .map((m) => `${m.direction === 'in' ? 'Müşteri' : 'Temsilci'}: ${m.body}`)
            .join('\n')
        }
      } catch (logErr) {
        logger.debug({ err: logErr, phoneE164 }, 'Konusma gecmisi alinamadi')
      }
    }

    const tone = kitRows[0]?.tone || 'Kurumsal, nazik, yardımsever ve samimi'
    const contextFingerprint = fingerprint(`${companyContext}\n${tone}\n${conversationHistory}`)

    // 1. ANINDA ÖN ÜRETİM: Kurumsal kimlik ve semantik niyete göre anında akıllı önerileri kaydet (< 10ms)
    const instantSuggestions = generateSmartSuggestions(
      trimmed,
      org.name,
      productRows.map((p) => p.name).join(', '),
      tone,
    )
    if (validSuggestions(instantSuggestions)) {
      await query(
        `insert into public.ai_reply_suggestion_library (
          org_id, message_fingerprint, context_fingerprint, incoming_sample,
          suggestions, source, generated_count, last_used_at, updated_at
        )
        values ($1, $2, $3, $4, $5::jsonb, 'smart_instant', 1, now(), now())
        on conflict (org_id, message_fingerprint, context_fingerprint)
        do update set
          suggestions = coalesce(public.ai_reply_suggestion_library.suggestions, excluded.suggestions),
          updated_at = now()`,
        [orgId, messageFingerprint, contextFingerprint, trimmed.slice(0, 500), JSON.stringify(instantSuggestions)],
      ).catch(() => {})

      if (semanticIntent) {
        const intentFingerprint = fingerprint(semanticIntent)
        await query(
          `insert into public.ai_reply_suggestion_library (
            org_id, message_fingerprint, context_fingerprint, incoming_sample,
            suggestions, source, generated_count, last_used_at, updated_at
          )
          values ($1, $2, $3, $4, $5::jsonb, 'smart_intent_instant', 1, now(), now())
          on conflict (org_id, message_fingerprint, context_fingerprint)
          do update set
            suggestions = coalesce(public.ai_reply_suggestion_library.suggestions, excluded.suggestions),
            updated_at = now()`,
          [orgId, intentFingerprint, fingerprint(companyContext), `[${semanticIntent}] ${trimmed.slice(0, 300)}`, JSON.stringify(instantSuggestions)],
        ).catch(() => {})
      }
    }

    let aiRes: Response | null = null
    try {
      aiRes = await fetchFromOmniStudio('/v1/chat/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: org.name,
          incomingMessage: trimmed,
          conversationHistory,
          companyContext,
          tone,
        }),
        signal: AbortSignal.timeout(35000),
      })
    } catch (omniErr) {
      logger.debug({ err: omniErr instanceof Error ? omniErr.message : omniErr, orgId }, 'OmniStudio gateway ulasilamadi, akilli yerel oneriler devrede')
      return
    }

    if (!aiRes || !aiRes.ok) {
      logger.debug({ status: aiRes?.status, orgId }, 'pregenerateAiSuggestions: gateway yanit vermedi, yerel oneriler korundu')
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

    if (semanticIntent) {
      const intentFingerprint = fingerprint(semanticIntent)
      await query(
        `insert into public.ai_reply_suggestion_library (
          org_id, message_fingerprint, context_fingerprint, incoming_sample,
          suggestions, source, generated_count, last_used_at, updated_at
        )
        values ($1, $2, $3, $4, $5::jsonb, 'chatgpt_intent', 1, now(), now())
        on conflict (org_id, message_fingerprint, context_fingerprint)
        do update set
          suggestions = excluded.suggestions,
          incoming_sample = excluded.incoming_sample,
          updated_at = now()`,
        [orgId, intentFingerprint, fingerprint(companyContext), `[${semanticIntent}] ${trimmed.slice(0, 300)}`, JSON.stringify(aiData.suggestions)],
      ).catch(() => {})
    }

    logger.info(
      { orgId, phoneE164, count: aiData.suggestions.length },
      'AI yanit onerileri onceden uretildi ve kutuphaneye kaydedildi',
    )
  } catch (err) {
    logger.debug({ err: err instanceof Error ? err.message : err, orgId }, 'pregenerateAiSuggestions atlandi')
  }
}
