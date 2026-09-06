import {
  DEFAULT_SCRAPE_UA,
  SKIP_EXT,
  extractFromHtml,
  finalizeContacts,
  mergePageExtract,
  resolveSeedUrl,
  sameHost,
  type ScrapeEngine,
  type ScrapedContact,
  type ScrapeResult,
} from '@wa/shared'
import { chromium, type Browser, type Page } from 'playwright'
import { logger } from '../logger.js'

const log = logger.child({ scope: 'scraper' })

export type CrawlOptions = {
  maxPages?: number
  mode?: 'auto' | 'static' | 'browser'
  timeoutMs?: number
}

export type CrawlResult = ScrapeResult & { engine: ScrapeEngine }

const SHORT_HTML = 512
const BLOCK_RESOURCE = /^(image|media|font)$/

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomDelay(): Promise<void> {
  return delay(300 + Math.floor(Math.random() * 500))
}

async function fetchStaticHtml(
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
      return { error: `${url} → boş veya çok kısa yanıt` }
    }
    return { html, finalUrl: response.url || url }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'istek başarısız'
    return { error: `${url} → ${message}` }
  } finally {
    clearTimeout(timer)
  }
}

function needsBrowserEscalation(html: string, contactCount: number): boolean {
  const trimmed = html.trim()
  if (!trimmed || trimmed.length < SHORT_HTML) return true
  if (contactCount === 0) {
    // SPA kabuğu / bot challenge ipuçları
    if (/<div[^>]+id=["'](?:root|__next|app)["']/i.test(trimmed) && trimmed.length < 8_000) {
      return true
    }
    if (/cloudflare|cf-browser-verification|just a moment|enable javascript/i.test(trimmed)) {
      return true
    }
    return true
  }
  return false
}

type CrawlAccum = {
  phoneMap: Map<string, ScrapedContact>
  emailOnly: Map<string, { email: string; sourceUrl: string }>
  errors: string[]
  pagesCrawled: number
  truncated: boolean
}

function emptyAccum(): CrawlAccum {
  return {
    phoneMap: new Map(),
    emailOnly: new Map(),
    errors: [],
    pagesCrawled: 0,
    truncated: false,
  }
}

function toResult(seedUrl: string, accum: CrawlAccum, engine: ScrapeEngine): CrawlResult {
  const { contacts, emailsOnly } = finalizeContacts(accum.phoneMap, accum.emailOnly)
  return {
    seedUrl,
    pagesCrawled: accum.pagesCrawled,
    contacts,
    emailsOnly,
    errors: accum.errors.slice(0, 8),
    truncated: accum.truncated,
    engine,
  }
}

async function crawlStatic(
  start: string,
  maxPages: number,
  timeoutMs: number,
  seedHtml?: { html: string; finalUrl: string },
): Promise<CrawlAccum> {
  const accum = emptyAccum()
  const queue: { url: string; priority: number }[] = [{ url: start, priority: 50 }]
  const seen = new Set<string>()
  let seeded = false

  while (queue.length > 0 && accum.pagesCrawled < maxPages) {
    queue.sort((a, b) => b.priority - a.priority)
    const next = queue.shift()!
    if (seen.has(next.url)) continue
    seen.add(next.url)
    if (SKIP_EXT.test(next.url)) continue

    let html: string
    let finalUrl: string

    if (!seeded && seedHtml && next.url === start) {
      html = seedHtml.html
      finalUrl = seedHtml.finalUrl
      seeded = true
    } else {
      const fetched = await fetchStaticHtml(next.url, timeoutMs)
      if ('error' in fetched) {
        accum.errors.push(fetched.error)
        continue
      }
      html = fetched.html
      finalUrl = fetched.finalUrl
    }

    accum.pagesCrawled += 1
    const page = extractFromHtml(html, finalUrl)
    mergePageExtract(accum.phoneMap, accum.emailOnly, page)

    for (const link of page.links) {
      if (seen.has(link.url)) continue
      if (!sameHost(start, link.url)) continue
      queue.push({ url: link.url, priority: link.score })
    }

    await randomDelay()
  }

  if (queue.some((item) => !seen.has(item.url))) accum.truncated = true
  return accum
}

async function preparePage(page: Page): Promise<void> {
  await page.route('**/*', (route) => {
    const type = route.request().resourceType()
    if (BLOCK_RESOURCE.test(type)) return route.abort()
    return route.continue()
  })

  await page.setExtraHTTPHeaders({
    'accept-language': 'tr-TR,tr;q=0.9,en;q=0.8',
  })
}

async function loadWithBrowser(page: Page, url: string, timeoutMs: number): Promise<string> {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs })
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await delay(1_500)
  }

  try {
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
    await delay(400)
  } catch {
    /* scroll opsiyonel */
  }

  return page.content()
}

async function crawlBrowser(
  start: string,
  maxPages: number,
  timeoutMs: number,
): Promise<CrawlAccum> {
  const accum = emptyAccum()
  let browser: Browser | null = null

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    })

    const context = await browser.newContext({
      userAgent: DEFAULT_SCRAPE_UA,
      locale: 'tr-TR',
      viewport: { width: 1366, height: 900 },
    })

    const page = await context.newPage()
    await preparePage(page)

    const queue: { url: string; priority: number }[] = [{ url: start, priority: 50 }]
    const seen = new Set<string>()

    while (queue.length > 0 && accum.pagesCrawled < maxPages) {
      queue.sort((a, b) => b.priority - a.priority)
      const next = queue.shift()!
      if (seen.has(next.url)) continue
      seen.add(next.url)
      if (SKIP_EXT.test(next.url)) continue

      try {
        const html = await loadWithBrowser(page, next.url, timeoutMs)
        const finalUrl = page.url() || next.url
        if (!html || html.trim().length < 32) {
          accum.errors.push(`${next.url} → boş veya çok kısa yanıt`)
          continue
        }

        accum.pagesCrawled += 1
        const extracted = extractFromHtml(html, finalUrl)
        mergePageExtract(accum.phoneMap, accum.emailOnly, extracted)

        for (const link of extracted.links) {
          if (seen.has(link.url)) continue
          if (!sameHost(start, link.url)) continue
          queue.push({ url: link.url, priority: link.score })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'sayfa yüklenemedi'
        accum.errors.push(`${next.url} → ${message}`)
      }

      await randomDelay()
    }

    if (queue.some((item) => !seen.has(item.url))) accum.truncated = true
    await context.close()
  } finally {
    await browser?.close().catch(() => undefined)
  }

  return accum
}

/**
 * Dual-engine kişi tarayıcı.
 * auto: seed için statik dene; boş/kısa/0 kişi → tüm crawl Playwright.
 */
export async function crawlContacts(
  seedInput: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const maxPages = Math.min(Math.max(options.maxPages ?? 15, 1), 20)
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 20_000, 5_000), 45_000)
  const mode = options.mode ?? 'auto'

  const start = resolveSeedUrl(seedInput)
  if (!start) {
    return {
      seedUrl: seedInput,
      pagesCrawled: 0,
      contacts: [],
      emailsOnly: [],
      errors: ['Geçerli bir http(s) adresi girin. Örnek: ornekfirma.com/iletisim'],
      truncated: false,
      engine: 'static',
    }
  }

  log.info({ start, maxPages, mode }, 'Kişi taraması başladı')

  if (mode === 'browser') {
    const accum = await crawlBrowser(start, maxPages, timeoutMs)
    return toResult(start, accum, 'browser')
  }

  if (mode === 'static') {
    const accum = await crawlStatic(start, maxPages, timeoutMs)
    return toResult(start, accum, 'static')
  }

  // auto
  const seedFetch = await fetchStaticHtml(start, timeoutMs)
  if ('error' in seedFetch) {
    log.info({ err: seedFetch.error }, 'Statik seed başarısız, Playwright')
    const accum = await crawlBrowser(start, maxPages, timeoutMs)
    return toResult(start, accum, 'browser')
  }

  const seedPage = extractFromHtml(seedFetch.html, seedFetch.finalUrl)
  if (needsBrowserEscalation(seedFetch.html, seedPage.phones.size)) {
    log.info(
      { htmlLen: seedFetch.html.length, phones: seedPage.phones.size },
      'Statik yetersiz, Playwright',
    )
    const accum = await crawlBrowser(start, maxPages, timeoutMs)
    return toResult(start, accum, 'hybrid')
  }

  const accum = await crawlStatic(start, maxPages, timeoutMs, seedFetch)
  return toResult(start, accum, 'static')
}
