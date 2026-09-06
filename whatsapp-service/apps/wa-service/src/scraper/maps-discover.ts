import { toE164Scraped, type ScrapedContact } from '@wa/shared'
import { chromium, type Browser, type Page } from 'playwright'
import { logger } from '../logger.js'

const log = logger.child({ scope: 'maps-discover' })

export type DiscoveredPlace = {
  name: string
  phone_e164: string | null
  address: string | null
  website: string | null
  mapsUrl: string | null
  rating: number | null
  category: string | null
}

export type DiscoverResult = {
  query: string
  places: DiscoveredPlace[]
  contacts: ScrapedContact[]
  errors: string[]
  truncated: boolean
  durationMs: number
}

export type DiscoverOptions = {
  maxResults?: number
  timeoutMs?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function dismissConsent(page: Page) {
  const candidates = [
    'button:has-text("Accept all")',
    'button:has-text("Tümünü kabul et")',
    'button:has-text("Accept")',
    'button:has-text("Kabul et")',
    'button[aria-label*="Accept"]',
    'button[aria-label*="Kabul"]',
    'form[action*="consent"] button',
    '[aria-modal="true"] button:has-text("Accept")',
  ]
  for (const sel of candidates) {
    try {
      const btn = page.locator(sel).first()
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click({ timeout: 2000 })
        await sleep(800)
        return
      }
    } catch {
      /* yok */
    }
  }
}

async function scrollFeed(page: Page, rounds: number) {
  const feed = page.locator('div[role="feed"]').first()
  if (!(await feed.count())) return

  for (let i = 0; i < rounds; i++) {
    await feed.evaluate((el) => {
      el.scrollBy(0, el.scrollHeight)
    })
    await sleep(1200 + Math.floor(Math.random() * 600))
    // Sonuna gelindi mi?
    const end = await page
      .locator('text=/Listenin sonuna ulaştınız|You.ve reached the end/i')
      .count()
    if (end > 0) break
  }
}

async function collectPlaceLinks(page: Page, limit: number): Promise<{ name: string; href: string }[]> {
  const links = await page.locator('a[href*="/maps/place/"]').evaluateAll((els) => {
    const out: { name: string; href: string }[] = []
    const seen = new Set<string>()
    for (const el of els) {
      const href = (el as { href?: string }).href ?? el.getAttribute('href')
      if (!href || !href.includes('/maps/place/') || seen.has(href)) continue
      seen.add(href)
      const name =
        el.getAttribute('aria-label')?.trim() ||
        el.textContent?.replace(/\s+/g, ' ').trim() ||
        ''
      if (!name) continue
      out.push({ name, href })
    }
    return out
  })

  return links.slice(0, limit)
}

function parsePhoneFromItemId(itemId: string | null): string | null {
  if (!itemId) return null
  // phone:tel:+905321112233 veya phone:tel:05321112233
  const m = itemId.match(/phone:tel:(.+)$/i)
  if (!m?.[1]) return null
  return toE164Scraped(decodeURIComponent(m[1]), 'high')
}

function isAcceptableBusinessPhone(e164: string | null): e164 is string {
  if (!e164) return false
  const digits = e164.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return false
  // Filo TR odaklı: yalnızca TR sabit/mobil (WhatsApp için anlamlı)
  if (!/^90[2-5]\d{9}$/.test(digits)) return false
  return true
}

function cleanPlaceName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\s*[·•]\s*\d+[.,]\d+.*$/u, '') // rating kuyruğu
    .replace(/\s*\(\d+\).*$/u, '')
    .trim()
}

async function extractPlaceDetails(page: Page, fallbackName: string): Promise<DiscoveredPlace | null> {
  // Detay paneli yüklenene kadar bekle (telefon veya adres)
  try {
    await page.waitForSelector('h1, button[data-item-id^="phone:tel"], button[data-item-id="address"]', {
      timeout: 8_000,
    })
  } catch {
    /* devam */
  }
  await sleep(500)

  const rawName =
    (await page.locator('h1').first().textContent().catch(() => null))?.trim() || fallbackName
  const name = cleanPlaceName(rawName)
  if (!name || name.length < 2) return null

  let phone_e164: string | null = null
  const phoneBtn = page.locator('button[data-item-id^="phone:tel"]').first()
  if (await phoneBtn.count()) {
    const itemId = await phoneBtn.getAttribute('data-item-id')
    phone_e164 = parsePhoneFromItemId(itemId)
    if (!phone_e164) {
      const label = (await phoneBtn.getAttribute('aria-label')) || (await phoneBtn.innerText())
      phone_e164 = toE164Scraped(label.replace(/^Telefon:?\s*/i, ''), 'high')
    }
  }
  if (!isAcceptableBusinessPhone(phone_e164)) phone_e164 = null

  let address: string | null = null
  const addrBtn = page.locator('button[data-item-id="address"]').first()
  if (await addrBtn.count()) {
    address =
      (await addrBtn.getAttribute('aria-label'))?.replace(/^Adres:?\s*/i, '').trim() ||
      (await addrBtn.innerText()).replace(/\s+/g, ' ').trim() ||
      null
  }

  let website: string | null = null
  const web = page.locator('a[data-item-id="authority"]').first()
  if (await web.count()) {
    const href = (await web.getAttribute('href')) || null
    // Google redirect URL'lerini temizle
    if (href && !href.includes('google.com/url')) website = href
    else if (href) {
      try {
        const u = new URL(href)
        website = u.searchParams.get('q') || href
      } catch {
        website = href
      }
    }
  }

  let category: string | null = null
  try {
    const cat = page.locator('button[jsaction*="category"]').first()
    if (await cat.count()) category = ((await cat.innerText()) || '').trim() || null
  } catch {
    /* */
  }

  let rating: number | null = null
  try {
    const ratingEl = page
      .locator('div[role="img"][aria-label*="yıldız"], div[role="img"][aria-label*="star"]')
      .first()
    const aria = (await ratingEl.getAttribute('aria-label')) || ''
    const m = aria.match(/([\d.,]+)/)
    const raw = m?.[1]
    if (raw) rating = Number.parseFloat(raw.replace(',', '.'))
    if (rating != null && (rating < 0 || rating > 5)) rating = null
  } catch {
    /* */
  }

  return {
    name,
    phone_e164,
    address,
    website,
    mapsUrl: page.url().split('?')[0] ?? page.url(),
    rating: Number.isFinite(rating) ? rating : null,
    category,
  }
}

/**
 * Google Maps yerel arama: "Bursa kuaför" → işletme listesi + telefon.
 * Sonuçlar kamuya açık işletme iletişim bilgileridir.
 */
export async function discoverLocalBusinesses(
  queryInput: string,
  options: DiscoverOptions = {},
): Promise<DiscoverResult> {
  const started = Date.now()
  const query = queryInput.trim().replace(/\s+/g, ' ')
  const maxResults = Math.min(Math.max(options.maxResults ?? 40, 5), 80)
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 45_000, 15_000), 90_000)
  const errors: string[] = []

  if (query.length < 3) {
    return {
      query,
      places: [],
      contacts: [],
      errors: ['Arama en az 3 karakter olmalı. Örnek: Bursa kuaför'],
      truncated: false,
      durationMs: Date.now() - started,
    }
  }

  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=tr`

  let browser: Browser | null = null
  const places: DiscoveredPlace[] = []

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    })

    const context = await browser.newContext({
      locale: 'tr-TR',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      viewport: { width: 1400, height: 900 },
    })

    const page = await context.newPage()
    page.setDefaultTimeout(timeoutMs)

    log.info({ query, searchUrl, maxResults }, 'Maps yerel arama başladı')
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await dismissConsent(page)

    // Tek sonuç (doğrudan place) durumu
    await sleep(2000)
    const feedCount = await page.locator('div[role="feed"]').count()
    if (feedCount === 0) {
      // Belki tek işletme açıldı
      const place = await extractPlaceDetails(page, query)
      if (place) places.push(place)
    } else {
      const scrollRounds = Math.min(12, Math.ceil(maxResults / 6) + 2)
      await scrollFeed(page, scrollRounds)
      const links = await collectPlaceLinks(page, maxResults)
      log.info({ links: links.length }, 'Maps sonuç kartları')

      for (const link of links) {
        if (places.length >= maxResults) break
        try {
          await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
          await sleep(700 + Math.floor(Math.random() * 500))
          const place = await extractPlaceDetails(page, link.name)
          if (place) places.push(place)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'place okunamadı'
          errors.push(`${link.name}: ${message}`)
        }
      }
    }

    await context.close()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Maps tarama başarısız'
    errors.push(message)
    log.error({ err: message, query }, 'Maps discover hata')
  } finally {
    await browser?.close().catch(() => undefined)
  }

  // İsim+telefon tekilleştir; telefonsuzları ayrı tut (bilgi amaçlı)
  const byPhone = new Map<string, DiscoveredPlace>()
  const noPhone: DiscoveredPlace[] = []
  for (const place of places) {
    if (place.phone_e164 && isAcceptableBusinessPhone(place.phone_e164)) {
      const prev = byPhone.get(place.phone_e164)
      if (!prev || (place.website && !prev.website)) byPhone.set(place.phone_e164, place)
    } else {
      noPhone.push({ ...place, phone_e164: null })
    }
  }

  const uniquePlaces = [...byPhone.values(), ...noPhone]
  const contacts: ScrapedContact[] = [...byPhone.values()].map((p) => ({
    phone_e164: p.phone_e164!,
    email: null,
    name: p.name,
    sourceUrl: p.website || p.mapsUrl || searchUrl,
    confidence: 'high' as const,
  }))

  log.info(
    {
      query,
      places: uniquePlaces.length,
      withPhone: contacts.length,
      ms: Date.now() - started,
    },
    'Maps yerel arama bitti',
  )

  return {
    query,
    places: uniquePlaces,
    contacts,
    errors: errors.slice(0, 12),
    truncated: places.length >= maxResults,
    durationMs: Date.now() - started,
  }
}
