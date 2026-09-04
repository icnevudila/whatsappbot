import {
  DEFAULT_SCRAPE_UA,
  SKIP_EXT,
  extractFromHtml,
  finalizeContacts,
  mergePageExtract,
  resolveSeedUrl,
  sameHost,
  type ScrapedContact,
  type ScrapeResult,
} from '@wa/shared'

export type { ScrapedContact, ScrapeResult }

type Options = {
  maxPages?: number
  timeoutMs?: number
  followSameHost?: boolean
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
        'user-agent': DEFAULT_SCRAPE_UA,
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
    if (!html || html.trim().length < 32) {
      return { error: `${url} → boş veya çok kısa yanıt (bot koruması / JS sayfa olabilir)` }
    }
    return { html, finalUrl: response.url || url }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'istek başarısız'
    return { error: `${url} → ${message}` }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Hızlı yol: Cheerio ile aynı sitede iletişim sayfalarını dolaşır.
 * JS ağır siteler için panel `contacts.scrape` job'ını (wa-service / Playwright) kullanır.
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
    const page = extractFromHtml(html, finalUrl)
    mergePageExtract(phoneMap, emailOnly, page)

    for (const link of page.links) {
      if (seen.has(link.url)) continue
      if (followSameHost && !sameHost(start, link.url)) continue
      queue.push({ url: link.url, priority: link.score })
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  if (queue.some((item) => !seen.has(item.url))) truncated = true

  const { contacts, emailsOnly } = finalizeContacts(phoneMap, emailOnly)

  return {
    seedUrl: start,
    pagesCrawled,
    contacts,
    emailsOnly,
    errors: errors.slice(0, 8),
    truncated,
  }
}
