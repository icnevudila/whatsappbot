import { query } from './db.js'
import { logger } from './logger.js'

type KnowledgeRow = {
  product_name: string | null
  price_amount: string | number | null
  currency: string | null
  raw_text: string | null
  source_media_url: string | null
}

type ExtractedKnowledge = {
  productName: string | null
  priceAmount: number | null
  currency: string | null
  rawText: string
  attributes: Record<string, unknown>
  confidence: number
}

const PRICE_RE =
  /(?:(?<currencyBefore>₺|tl|try|usd|eur|\$|€)\s*)?(?<amount>\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?<currencyAfter>₺|tl|try|usd|eur|\$|€)?/iu

function normalizeCurrency(input: string | undefined): string | null {
  const value = input?.trim().toLocaleLowerCase('tr-TR')
  if (!value) return null
  if (value === '₺' || value === 'tl' || value === 'try') return 'TRY'
  if (value === '$' || value === 'usd') return 'USD'
  if (value === '€' || value === 'eur') return 'EUR'
  return null
}

function parseAmount(input: string): number | null {
  const cleaned = input.replace(/\s/g, '')
  const normalized =
    cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(',', '.')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

function cleanProductName(input: string): string | null {
  const value = input
    .replace(PRICE_RE, ' ')
    .replace(/\b(fiyat|kampanya|indirim|ürün|urun|stok|adet|kdv|tl|try|usd|eur)\b/giu, ' ')
    .replace(/[•|:;,_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (value.length < 3) return null
  return value.slice(0, 160)
}

export function extractKnowledgeFromText(text: string | null | undefined): ExtractedKnowledge[] {
  const raw = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!raw) return []

  const parts = raw
    .split(/\n|(?:\s[-–—]\s)|(?:\s{2,})/)
    .map((part) => part.trim())
    .filter(Boolean)
  const candidates = parts.length > 0 ? parts : [raw]
  const results: ExtractedKnowledge[] = []

  for (const candidate of candidates) {
    const match = candidate.match(PRICE_RE)
    const productName = cleanProductName(candidate)
    const priceAmount = match?.groups?.amount ? parseAmount(match.groups.amount) : null
    const currency =
      normalizeCurrency(match?.groups?.currencyBefore) ??
      normalizeCurrency(match?.groups?.currencyAfter) ??
      (priceAmount ? 'TRY' : null)

    if (!productName && !priceAmount) continue
    results.push({
      productName,
      priceAmount,
      currency,
      rawText: candidate.slice(0, 1000),
      attributes: {
        hasPrice: Boolean(priceAmount),
        learnedBy: 'deterministic',
      },
      confidence: priceAmount ? 0.82 : 0.55,
    })
  }

  return results.slice(0, 8)
}

export async function extractKnowledgeFromAI(options: {
  orgName?: string
  text?: string | null
  mediaUrl?: string | null
}): Promise<ExtractedKnowledge[]> {
  let gatewayUrl = process.env.OMNISTUDIO_GATEWAY_URL || 'http://omnistudio-engine:3456'
  if (gatewayUrl.includes('127.0.0.1') || gatewayUrl.includes('localhost')) {
    gatewayUrl = 'http://omnistudio-engine:3456'
  }
  gatewayUrl = gatewayUrl.replace(/\/$/, '')

  try {
    const res = await fetch(`${gatewayUrl}/v1/chat/extract-knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: options.orgName || 'Genel',
        text: options.text || '',
        mediaUrl: options.mediaUrl || null,
      }),
      signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) return []
    const data = (await res.json()) as {
      success?: boolean
      products?: Array<{ name: string; price: number; currency?: string; unit?: string; details?: string }>
      campaign?: { title?: string; discount?: string; conditions?: string }
      ocrText?: string
    }

    if (!data.success) return []
    const results: ExtractedKnowledge[] = []

    if (Array.isArray(data.products)) {
      for (const prod of data.products) {
        if (!prod.name && !prod.price) continue
        results.push({
          productName: prod.name ? cleanProductName(prod.name) : null,
          priceAmount: typeof prod.price === 'number' ? prod.price : parseAmount(String(prod.price)),
          currency: prod.currency || 'TRY',
          rawText: [prod.name, prod.details, prod.unit, data.campaign?.title].filter(Boolean).join(' - '),
          attributes: {
            unit: prod.unit || null,
            details: prod.details || null,
            campaign: data.campaign || null,
            learnedBy: 'chatgpt-vision-ocr',
          },
          confidence: 0.95,
        })
      }
    }

    if (data.ocrText && results.length === 0) {
      results.push({
        productName: null,
        priceAmount: null,
        currency: null,
        rawText: data.ocrText.slice(0, 1000),
        attributes: {
          ocrText: data.ocrText,
          campaign: data.campaign || null,
          learnedBy: 'chatgpt-vision-ocr',
        },
        confidence: 0.85,
      })
    }

    return results
  } catch (err) {
    logger.warn({ err }, 'product-knowledge: AI vision ocr istegi basarisiz')
    return []
  }
}

export async function rememberMessageKnowledge(options: {
  orgId: string
  sourceMessageId: string
  phoneE164: string | null
  messageType: string
  body: string | null
  mediaUrl: string | null
}): Promise<void> {
  const { orgId, sourceMessageId, phoneE164, messageType, body, mediaUrl } = options
  const extracted = extractKnowledgeFromText(body)

  if (extracted.length === 0 && mediaUrl && (messageType === 'image' || messageType === 'sticker')) {
    extracted.push({
      productName: null,
      priceAmount: null,
      currency: null,
      rawText: body?.slice(0, 1000) ?? '',
      attributes: {
        hasImage: true,
        needsVision: true,
        learnedBy: 'media-placeholder',
      },
      confidence: 0.35,
    })
  }

  for (const item of extracted) {
    try {
      await query(
        `insert into public.reply_product_knowledge (
          org_id, source_message_id, source, phone_e164, product_name, price_amount,
          currency, raw_text, source_media_url, attributes, confidence, last_seen_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, now(), now())
        on conflict (org_id, source_message_id, coalesce(product_name, ''), coalesce(price_amount, -1), coalesce(currency, ''))
        where source_message_id is not null
        do update set
          phone_e164 = excluded.phone_e164,
          raw_text = excluded.raw_text,
          source_media_url = excluded.source_media_url,
          attributes = excluded.attributes,
          confidence = greatest(public.reply_product_knowledge.confidence, excluded.confidence),
          last_seen_at = now(),
          updated_at = now()`,
        [
          orgId,
          Number(sourceMessageId),
          messageType === 'image' || messageType === 'sticker' ? 'image' : 'message',
          phoneE164,
          item.productName,
          item.priceAmount,
          item.currency,
          item.rawText,
          mediaUrl,
          JSON.stringify(item.attributes),
          item.confidence,
        ],
      )
    } catch (error) {
      logger.warn({ err: error, orgId, sourceMessageId }, 'product-knowledge: kaydedilemedi')
    }
  }

  // Eğer görsel veya kampanya metni varsa arka planda ChatGPT Vision OCR ile derin analiz yap
  if (mediaUrl || (body && body.length > 20)) {
    void (async () => {
      try {
        const orgRows = await query<{ name: string }>(
          `select name from public.organizations where id = $1 limit 1`,
          [orgId]
        )
        const orgName = orgRows[0]?.name || 'Genel'
        const aiKnowledge = await extractKnowledgeFromAI({
          orgName,
          text: body,
          mediaUrl,
        })
        for (const aiItem of aiKnowledge) {
          await query(
            `insert into public.reply_product_knowledge (
              org_id, source_message_id, source, phone_e164, product_name, price_amount,
              currency, raw_text, source_media_url, attributes, confidence, last_seen_at, updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, now(), now())
            on conflict (org_id, source_message_id, coalesce(product_name, ''), coalesce(price_amount, -1), coalesce(currency, ''))
            where source_message_id is not null
            do update set
              phone_e164 = excluded.phone_e164,
              product_name = coalesce(excluded.product_name, public.reply_product_knowledge.product_name),
              price_amount = coalesce(excluded.price_amount, public.reply_product_knowledge.price_amount),
              currency = coalesce(excluded.currency, public.reply_product_knowledge.currency),
              raw_text = excluded.raw_text,
              source_media_url = excluded.source_media_url,
              attributes = excluded.attributes,
              confidence = excluded.confidence,
              last_seen_at = now(),
              updated_at = now()`,
            [
              orgId,
              Number(sourceMessageId),
              mediaUrl ? 'image' : 'message',
              phoneE164,
              aiItem.productName,
              aiItem.priceAmount,
              aiItem.currency,
              aiItem.rawText,
              mediaUrl,
              JSON.stringify(aiItem.attributes),
              aiItem.confidence,
            ],
          )
        }
      } catch (err) {
        logger.warn({ err, orgId }, 'product-knowledge: async AI OCR kaydedilemedi')
      }
    })()
  }
}

export async function rememberCampaignKnowledge(options: {
  orgId: string
  campaignId: string
  phoneE164?: string | null
  body: string | null
  mediaUrl: string | null
}): Promise<void> {
  const { orgId, campaignId, phoneE164, body, mediaUrl } = options

  // 1. Kampanya ve bağlı görsel (creatives) verilerini doğrudan veritabanından çek (OCR gereksiz)
  type CampaignCreativeData = {
    campaign_name: string
    body: string | null
    media_url: string | null
    creative_id: string | null
    creative_title: string | null
    payload: unknown
  }

  try {
    const campaignRows = await query<CampaignCreativeData>(
      `select c.name as campaign_name, c.body, c.media_url, c.creative_id,
              cr.title as creative_title, cr.payload
         from public.campaigns c
         left join public.creatives cr on cr.id = c.creative_id
        where c.id = $1 and c.org_id = $2
        limit 1`,
      [campaignId, orgId],
    )

    const campaign = campaignRows[0]
    const creativePayload = campaign?.payload as {
      brief?: string
      products?: Array<{
        name?: string
        price?: string
        oldPrice?: string
        promo?: string
        description?: string
        imageUrl?: string
      }>
    } | null

    // 2. Görsel sihirbazı veya kampanya ürün verilerini doğrudan %100 güvenle kaydet
    if (creativePayload?.products && Array.isArray(creativePayload.products) && creativePayload.products.length > 0) {
      for (const p of creativePayload.products) {
        const pName = p.name?.trim()
        if (!pName) continue
        const pPrice = p.price ? parseAmount(p.price) : null
        const pCurrency = normalizeCurrency(p.price) ?? 'TRY'
        const rawText = `${pName}${p.price ? ` - Fiyat: ${p.price}` : ''}${p.promo ? ` (${p.promo})` : ''}${p.description ? ` - ${p.description}` : ''}`

        await query(
          `insert into public.reply_product_knowledge (
            org_id, source, phone_e164, product_name, price_amount,
            currency, raw_text, source_media_url, attributes, confidence, last_seen_at, updated_at
          )
          values ($1, 'campaign', $2, $3, $4, $5, $6, $7, $8::jsonb, 1.0, now(), now())`,
          [
            orgId,
            phoneE164 ?? null,
            pName,
            pPrice,
            pCurrency,
            rawText,
            mediaUrl ?? campaign?.media_url ?? null,
            JSON.stringify({
              campaignId,
              creativeId: campaign?.creative_id ?? null,
              promo: p.promo ?? null,
              oldPrice: p.oldPrice ?? null,
            }),
          ],
        )
      }

      logger.info(
        { orgId, campaignId, count: creativePayload.products.length },
        'campaign-knowledge: kampanya urunleri gorsel veritabanindan eklendi (OCR atlandi, 0ms gecikme)',
      )
    }
  } catch (error) {
    logger.warn({ err: error, orgId, campaignId }, 'campaign-knowledge: kampanya/gorsel verisi okunamadi')
  }

  // 3. Kampanya mesaj metninden (body) hızlı regex ile ek ürün/fiyat çıkarımı
  const effectiveBody = body
  const extracted = extractKnowledgeFromText(effectiveBody)

  for (const item of extracted) {
    try {
      await query(
        `insert into public.reply_product_knowledge (
          org_id, source, phone_e164, product_name, price_amount,
          currency, raw_text, source_media_url, attributes, confidence, last_seen_at, updated_at
        )
        values ($1, 'campaign', $2, $3, $4, $5, $6, $7, $8::jsonb, $9, now(), now())`,
        [
          orgId,
          phoneE164 ?? null,
          item.productName,
          item.priceAmount,
          item.currency,
          item.rawText,
          mediaUrl,
          JSON.stringify({ campaignId, ...item.attributes }),
          item.confidence,
        ],
      )
    } catch (error) {
      logger.warn({ err: error, orgId, campaignId }, 'campaign-knowledge: metin bilgisi kaydedilemedi')
    }
  }
}

export async function buildKnowledgeContext(options: {
  orgId: string
  phoneE164?: string | null
  message?: string | null
}): Promise<string> {
  const rows = await query<KnowledgeRow>(
    `select product_name, price_amount, currency, raw_text, source_media_url
       from public.reply_product_knowledge
      where org_id = $1
        and (
          product_name is not null
          or price_amount is not null
          or source_media_url is not null
        )
      order by
        case when phone_e164 = $2 then 0 else 1 end,
        last_seen_at desc
      limit 8`,
    [options.orgId, options.phoneE164 ?? null],
  )

  if (rows.length === 0) return ''
  const lines = rows.map((row) => {
    const price =
      row.price_amount != null
        ? ` fiyat: ${Number(row.price_amount).toLocaleString('tr-TR')} ${row.currency ?? 'TRY'}`
        : ''
    const product = row.product_name ? row.product_name : 'Gorseldeki/son paylasilan urun'
    const media = row.source_media_url ? ' (gorsel kaynagi var)' : ''
    const raw = row.raw_text ? `; not: ${row.raw_text.slice(0, 140)}` : ''
    return `- ${product}${price}${media}${raw}`
  })
  return `Ogrenilen urun/fiyat bilgileri:\n${lines.join('\n')}`
}
