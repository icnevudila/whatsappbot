import * as cheerio from 'cheerio'
import { toE164Scraped } from '@wa/shared'

export type ScrapedContact = {
  phone_e164: string
  email: string | null
  name: string | null
  sourceUrl: string
  confidence: 'high' | 'medium'
}

export type ScrapeResult = {
  seedUrl: string
  pagesCrawled: number
  contacts: ScrapedContact[]
  emailsOnly: { email: string; sourceUrl: string }[]
  errors: string[]
  truncated: boolean
}

const EMAIL_RE =
  /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi

/** Düz metinden aday telefon parçaları (Crawlee social yaklaşımı + TR). */
const PHONE_CANDIDATE_RE =
  /(?:\+|00)?[\d][\d\s()./-]{7,22}\d/g

const CONTACT_PATH_HINT =
  /iletisim|iletişim|contact|hakkimizda|hakkımızda|about|team|ekip|kadro|personel|staff|directory|rehber|adres|location|ulasim|ulaşım|bize-ulasin|bizeulasin/i

const SKIP_EXT = /\.(pdf|jpg|jpeg|png|gif|webp|svg|css|js|mjs|map|woff2?|ttf|ico|mp4|zip|rar)(\?|$)/i

const DEFAULT_UA =
  'Mozilla/5.0 (compatible; FiloContactBot/1.0; +https://filo.dev; business-contact-discovery)'

type Options = {
  maxPages?: number
  timeoutMs?: number
  followSameHost?: boolean
}

function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

/** Kullanıcı girdisi: "ornek.com" → https://ornek.com/ */
function resolveSeedUrl(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed.length < 4) return null
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProto)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).hostname.replace(/^www\./, '') === new URL(b).hostname.replace(/^www\./, '')
  } catch {
    return false
  }
}

function extractEmails(text: string): string[] {
  const found = text.match(EMAIL_RE) ?? []
  const cleaned = found
    .map((email) => email.toLowerCase().replace(/^mailto:/i, ''))
    .filter((email) => !email.endsWith('.png') && !email.endsWith('.jpg'))
  return [...new Set(cleaned)]
}

function extractPhonesFromText(text: string): { phone: string; confidence: 'high' | 'medium' }[] {
  const out: { phone: string; confidence: 'high' | 'medium' }[] = []
  const seen = new Set<string>()

  for (const match of text.match(PHONE_CANDIDATE_RE) ?? []) {
    const e164 = toE164Scraped(match, 'medium')
    if (!e164 || seen.has(e164)) continue
    seen.add(e164)
    out.push({ phone: e164, confidence: 'medium' })
  }

  return out
}

function scoreLink(href: string): number {
  try {
    const path = new URL(href).pathname
    if (CONTACT_PATH_HINT.test(path)) return 100
    if (path === '/' || path === '') return 10
    return 1
  } catch {
    return 0
  }
}

async function fetchHtml(
  url: string,
  timeoutMs: number,
): Promise<{ html: string; finalUrl: string } | { error: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': DEFAULT_UA,
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'accept-language': 'tr-TR,tr;q=0.9,en;q=0.8',
      },
    })

    if (!response.ok) return { error: `${url} → HTTP ${response.status}` }

    const contentType = response.headers.get('content-type') ?? ''
    if (!/text\/html|application\/xhtml/i.test(contentType) && contentType) {
      return { error: `${url} → HTML değil (${contentType})` }
    }

    const html = await response.text()
    return { html, finalUrl: response.url || url }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'istek başarısız'
    return { error: `${url} → ${message}` }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Aynı sitede iletişim sayfalarını dolaşıp telefon + e-posta çıkarır.
 *
 * Mimari: Cheerio (statik HTML) — Vercel/serverless uyumlu.
 * Playwright/Crawlee JS siteleri için wa-service'e eklenebilir; çoğu kurumsal
 * iletişim sayfası SSR/statik olduğu için Cheerio tutarlı sonuç verir.
 */
export async function scrapeContactsFromUrl(
  seedInput: string,
  options: Options = {},
): Promise<ScrapeResult> {
  const maxPages = Math.min(Math.max(options.maxPages ?? 10, 1), 20)
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 12_000, 3_000), 25_000)
  const followSameHost = options.followSameHost !== false

  const start = resolveSeedUrl(seedInput)
  if (!start) {
    return {
      seedUrl: seedInput,
      pagesCrawled: 0,
      contacts: [],
      emailsOnly: [],
      errors: ['Geçerli bir http(s) adresi girin. Örnek: ornekfirma.com/iletisim'],
      truncated: false,
    }
  }

  const queue: { url: string; priority: number }[] = [{ url: start, priority: 50 }]
  const seen = new Set<string>()
  const errors: string[] = []
  const phoneMap = new Map<string, ScrapedContact>()
  const emailOnly = new Map<string, { email: string; sourceUrl: string }>()
  let pagesCrawled = 0
  let truncated = false

  while (queue.length > 0 && pagesCrawled < maxPages) {
    queue.sort((a, b) => b.priority - a.priority)
    const next = queue.shift()!
    if (seen.has(next.url)) continue
    seen.add(next.url)

    if (SKIP_EXT.test(next.url)) continue

    const fetched = await fetchHtml(next.url, timeoutMs)
    if ('error' in fetched) {
      errors.push(fetched.error)
      continue
    }

    pagesCrawled += 1
    const { html, finalUrl } = fetched
    const $ = cheerio.load(html)

    // Gürültü azalt: script/style/nav tekrarları.
    $('script, style, noscript, svg, iframe').remove()

    const pageText = $('body').text().replace(/\s+/g, ' ')

    // Schema.org / microdata telefon
    $('[itemprop="telephone"], [itemprop="email"]').each((_, el) => {
      const prop = ($(el).attr('itemprop') ?? '').toLowerCase()
      const value = ($(el).attr('content') || $(el).text() || '').trim()
      if (!value) return
      if (prop === 'telephone') {
        const e164 = toE164Scraped(value, 'high')
        if (e164) {
          phoneMap.set(e164, {
            phone_e164: e164,
            email: phoneMap.get(e164)?.email ?? null,
            name: phoneMap.get(e164)?.name ?? null,
            sourceUrl: finalUrl,
            confidence: 'high',
          })
        }
      }
      if (prop === 'email' && value.includes('@')) {
        emailOnly.set(value.toLowerCase().replace(/^mailto:/i, ''), {
          email: value.toLowerCase().replace(/^mailto:/i, ''),
          sourceUrl: finalUrl,
        })
      }
    })

    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).text()
      if (!raw) return
      try {
        const data = JSON.parse(raw) as unknown
        const nodes = Array.isArray(data) ? data : [data]
        for (const node of nodes) {
          if (!node || typeof node !== 'object') continue
          const record = node as Record<string, unknown>
          const tel = record.telephone
          const mail = record.email
          if (typeof tel === 'string') {
            const e164 = toE164Scraped(tel, 'high')
            if (e164) {
              phoneMap.set(e164, {
                phone_e164: e164,
                email: phoneMap.get(e164)?.email ?? null,
                name: phoneMap.get(e164)?.name ?? null,
                sourceUrl: finalUrl,
                confidence: 'high',
              })
            }
          }
          if (typeof mail === 'string' && mail.includes('@')) {
            const email = mail.toLowerCase()
            emailOnly.set(email, { email, sourceUrl: finalUrl })
          }
        }
      } catch {
        /* bozuk JSON-LD */
      }
    })

    // Yüksek güven: tel: / mailto:
    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') ?? '').trim()
      const label = $(el).text().replace(/\s+/g, ' ').trim() || null

      if (/^tel:/i.test(href)) {
        const e164 = toE164Scraped(href, 'high')
        if (e164) {
          const prev = phoneMap.get(e164)
          phoneMap.set(e164, {
            phone_e164: e164,
            email: prev?.email ?? null,
            name: prev?.name ?? label,
            sourceUrl: finalUrl,
            confidence: 'high',
          })
        }
      }

      if (/^mailto:/i.test(href)) {
        const email = href.replace(/^mailto:/i, '').split('?')[0]?.toLowerCase()
        if (email && email.includes('@')) {
          // En son bulunan telefonla eşleştirmek zor; e-postayı ayrı tut.
          emailOnly.set(email, { email, sourceUrl: finalUrl })
        }
      }

      const abs = normalizeUrl(href, finalUrl)
      if (!abs || seen.has(abs)) return
      if (followSameHost && !sameHost(start, abs)) return
      if (SKIP_EXT.test(abs)) return

      queue.push({ url: abs, priority: scoreLink(abs) })
    })

    for (const { phone, confidence } of extractPhonesFromText(pageText)) {
      if (phoneMap.has(phone)) continue
      phoneMap.set(phone, {
        phone_e164: phone,
        email: null,
        name: null,
        sourceUrl: finalUrl,
        confidence,
      })
    }

    for (const email of extractEmails(pageText)) {
      if (!emailOnly.has(email)) emailOnly.set(email, { email, sourceUrl: finalUrl })
    }

    // Sayfalar arası nazik bekleme.
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  if (queue.some((item) => !seen.has(item.url))) truncated = true

  // E-postaları telefona yakıştır: aynı sayfadan gelen ilk e-posta.
  const emailsByPage = new Map<string, string[]>()
  for (const item of emailOnly.values()) {
    const list = emailsByPage.get(item.sourceUrl) ?? []
    list.push(item.email)
    emailsByPage.set(item.sourceUrl, list)
  }

  for (const contact of phoneMap.values()) {
    if (contact.email) continue
    const pageEmails = emailsByPage.get(contact.sourceUrl)
    if (pageEmails?.[0]) contact.email = pageEmails[0]
  }

  const usedEmails = new Set(
    [...phoneMap.values()].map((contact) => contact.email).filter(Boolean) as string[],
  )

  return {
    seedUrl: start,
    pagesCrawled,
    contacts: [...phoneMap.values()].sort((a, b) =>
      a.confidence === b.confidence
        ? a.phone_e164.localeCompare(b.phone_e164)
        : a.confidence === 'high'
          ? -1
          : 1,
    ),
    emailsOnly: [...emailOnly.values()].filter((item) => !usedEmails.has(item.email)),
    errors: errors.slice(0, 8),
    truncated,
  }
}
