import * as cheerio from 'cheerio'
import { toE164Scraped } from './phone'

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

export type ScrapeEngine = 'static' | 'browser' | 'hybrid'

export type ContactsScrapeJobResult = ScrapeResult & {
  engine: ScrapeEngine
  durationMs: number
}

export type DiscoveredPlace = {
  name: string
  phone_e164: string | null
  address: string | null
  website: string | null
  mapsUrl: string | null
  rating: number | null
  category: string | null
}

export type ContactsDiscoverJobResult = {
  query: string
  places: DiscoveredPlace[]
  contacts: ScrapedContact[]
  errors: string[]
  truncated: boolean
  durationMs: number
}

export type PageExtract = {
  phones: Map<string, ScrapedContact>
  emails: Map<string, { email: string; sourceUrl: string }>
  links: { url: string; score: number }[]
}

const EMAIL_RE =
  /(?:^|[^a-z0-9._%+-])([a-z0-9._%+-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)/gi

/** Düz metinden aday telefon parçaları (Crawlee social yaklaşımı + TR). */
const PHONE_CANDIDATE_RE = /(?:\+|00)?[\d][\d\s()./-]{7,22}\d/g

export const CONTACT_PATH_HINT =
  /iletisim|iletişim|contact|hakkimizda|hakkımızda|about|team|ekip|kadro|personel|staff|directory|rehber|adres|location|ulasim|ulaşım|bize-ulasin|bizeulasin/i

export const SKIP_EXT =
  /\.(pdf|jpg|jpeg|png|gif|webp|svg|css|js|mjs|map|woff2?|ttf|ico|mp4|zip|rar)(\?|$)/i

export const DEFAULT_SCRAPE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FiloContactBot/1.0'

export function normalizeUrl(href: string, base: string): string | null {
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
export function resolveSeedUrl(input: string): string | null {
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

export function sameHost(a: string, b: string): boolean {
  try {
    return (
      new URL(a).hostname.replace(/^www\./, '') === new URL(b).hostname.replace(/^www\./, '')
    )
  } catch {
    return false
  }
}

export function scoreLink(href: string): number {
  try {
    const path = new URL(href).pathname
    if (CONTACT_PATH_HINT.test(path)) return 100
    if (path === '/' || path === '') return 10
    return 1
  } catch {
    return 0
  }
}

function extractEmails(text: string): string[] {
  const cleaned: string[] = []
  for (const match of text.matchAll(EMAIL_RE)) {
    const email = (match[1] ?? '').toLowerCase()
    if (!email || email.endsWith('.png') || email.endsWith('.jpg')) continue
    const local = email.split('@')[0] ?? ''
    if (local.length < 2 || local.length > 40) continue
    if (/(.)\1{5,}/.test(local)) continue
    cleaned.push(email)
  }

  const unique = [...new Set(cleaned)]
  return unique.filter((email) => {
    const [local, domain] = email.split('@')
    if (!local || !domain) return false
    return !unique.some((other) => {
      if (other === email) return false
      const [oLocal, oDomain] = other.split('@')
      return oDomain === domain && oLocal && local.length > oLocal.length && local.endsWith(oLocal)
    })
  })
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

function upsertPhone(
  phones: Map<string, ScrapedContact>,
  phone: string,
  patch: Omit<ScrapedContact, 'phone_e164'>,
): void {
  const prev = phones.get(phone)
  phones.set(phone, {
    phone_e164: phone,
    email: prev?.email ?? patch.email,
    name: prev?.name ?? patch.name,
    sourceUrl: prev?.sourceUrl ?? patch.sourceUrl,
    confidence:
      prev?.confidence === 'high' || patch.confidence === 'high' ? 'high' : 'medium',
  })
}

/**
 * Tek HTML sayfasından telefon, e-posta ve skorlu aynı-köken aday linklerini çıkarır.
 */
export function extractFromHtml(html: string, finalUrl: string): PageExtract {
  const phones = new Map<string, ScrapedContact>()
  const emails = new Map<string, { email: string; sourceUrl: string }>()
  const links: { url: string; score: number }[] = []
  const linkSeen = new Set<string>()

  const $ = cheerio.load(html)

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
            upsertPhone(phones, e164, {
              email: null,
              name: null,
              sourceUrl: finalUrl,
              confidence: 'high',
            })
          }
        }
        if (typeof mail === 'string' && mail.includes('@')) {
          const email = mail.toLowerCase()
          emails.set(email, { email, sourceUrl: finalUrl })
        }
      }
    } catch {
      /* bozuk JSON-LD */
    }
  })

  $('script, style, noscript, svg, iframe').remove()

  const pageText = $('body').text().replace(/\s+/g, ' ')

  $('[itemprop="telephone"], [itemprop="email"]').each((_, el) => {
    const prop = ($(el).attr('itemprop') ?? '').toLowerCase()
    const value = ($(el).attr('content') || $(el).text() || '').trim()
    if (!value) return
    if (prop === 'telephone') {
      const e164 = toE164Scraped(value, 'high')
      if (e164) {
        upsertPhone(phones, e164, {
          email: null,
          name: null,
          sourceUrl: finalUrl,
          confidence: 'high',
        })
      }
    }
    if (prop === 'email' && value.includes('@')) {
      const email = value.toLowerCase().replace(/^mailto:/i, '')
      emails.set(email, { email, sourceUrl: finalUrl })
    }
  })

  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim()
    const label = $(el).text().replace(/\s+/g, ' ').trim() || null

    if (/^tel:/i.test(href)) {
      const e164 = toE164Scraped(href, 'high')
      if (e164) {
        upsertPhone(phones, e164, {
          email: null,
          name: label,
          sourceUrl: finalUrl,
          confidence: 'high',
        })
      }
    }

    if (/^mailto:/i.test(href)) {
      const email = href.replace(/^mailto:/i, '').split('?')[0]?.toLowerCase()
      if (email && email.includes('@')) {
        emails.set(email, { email, sourceUrl: finalUrl })
      }
    }

    const abs = normalizeUrl(href, finalUrl)
    if (!abs || linkSeen.has(abs) || SKIP_EXT.test(abs)) return
    linkSeen.add(abs)
    links.push({ url: abs, score: scoreLink(abs) })
  })

  for (const { phone, confidence } of extractPhonesFromText(pageText)) {
    if (phones.has(phone)) continue
    upsertPhone(phones, phone, {
      email: null,
      name: null,
      sourceUrl: finalUrl,
      confidence,
    })
  }

  for (const email of extractEmails(pageText)) {
    if (!emails.has(email)) emails.set(email, { email, sourceUrl: finalUrl })
  }

  return { phones, emails, links }
}

export function mergePageExtract(
  phoneMap: Map<string, ScrapedContact>,
  emailOnly: Map<string, { email: string; sourceUrl: string }>,
  page: PageExtract,
): void {
  for (const [phone, contact] of page.phones) {
    const prev = phoneMap.get(phone)
    if (!prev) {
      phoneMap.set(phone, { ...contact })
      continue
    }
    phoneMap.set(phone, {
      phone_e164: phone,
      email: prev.email ?? contact.email,
      name: prev.name ?? contact.name,
      sourceUrl: prev.sourceUrl,
      confidence: prev.confidence === 'high' || contact.confidence === 'high' ? 'high' : 'medium',
    })
  }
  for (const [email, item] of page.emails) {
    if (!emailOnly.has(email)) emailOnly.set(email, item)
  }
}

/** Sayfalar arası e-posta temizliği + telefona eşleme. */
export function finalizeContacts(
  phoneMap: Map<string, ScrapedContact>,
  emailOnly: Map<string, { email: string; sourceUrl: string }>,
): Pick<ScrapeResult, 'contacts' | 'emailsOnly'> {
  const allEmails = [...emailOnly.keys()]
  for (const email of allEmails) {
    const [local, domain] = email.split('@')
    if (!local || !domain) continue
    const isConcat = allEmails.some((other) => {
      if (other === email) return false
      const [oLocal, oDomain] = other.split('@')
      return oDomain === domain && oLocal && local.length > oLocal.length && local.endsWith(oLocal)
    })
    if (isConcat) emailOnly.delete(email)
  }

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

  // 444 16 00 gibi kısa / ülke kodu yanlış yakalanmış numaraları ele.
  const contacts = [...phoneMap.values()]
    .filter((c) => {
      const digits = c.phone_e164.replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= 15
    })
    .sort((a, b) =>
      a.confidence === b.confidence
        ? a.phone_e164.localeCompare(b.phone_e164)
        : a.confidence === 'high'
          ? -1
          : 1,
    )

  const usedEmails = new Set(contacts.map((c) => c.email).filter(Boolean) as string[])

  return {
    contacts,
    emailsOnly: [...emailOnly.values()].filter((item) => !usedEmails.has(item.email)),
  }
}
