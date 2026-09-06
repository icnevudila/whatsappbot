import {
  toE164Scraped,
  type ContactsDiscoverJobResult,
  type DiscoveredPlace,
  type ScrapedContact,
} from '@wa/shared'
import { env } from '../env.js'
import { logger } from '../logger.js'

const log = logger.child({ scope: 'places-discover' })

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.primaryTypeDisplayName',
].join(',')

type PlacesApiPlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  googleMapsUri?: string
  primaryTypeDisplayName?: { text?: string }
}

type PlacesSearchResponse = {
  places?: PlacesApiPlace[]
  nextPageToken?: string
  error?: { message?: string; status?: string }
}

function isAcceptableBusinessPhone(e164: string | null): e164 is string {
  if (!e164) return false
  const digits = e164.replace(/\D/g, '')
  return /^90[2-5]\d{9}$/.test(digits)
}

function mapPlace(place: PlacesApiPlace): DiscoveredPlace | null {
  const name = place.displayName?.text?.trim()
  if (!name) return null

  const rawPhone = place.internationalPhoneNumber || null
  let phone_e164 = rawPhone ? toE164Scraped(rawPhone, 'high') : null
  if (!isAcceptableBusinessPhone(phone_e164)) phone_e164 = null

  return {
    name,
    phone_e164,
    address: place.formattedAddress?.trim() || null,
    website: place.websiteUri?.trim() || null,
    mapsUrl: place.googleMapsUri?.trim() || null,
    rating: null,
    category: place.primaryTypeDisplayName?.text?.trim() || null,
  }
}

async function searchTextPage(
  apiKey: string,
  textQuery: string,
  pageSize: number,
  pageToken?: string,
): Promise<PlacesSearchResponse> {
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: 'tr',
    regionCode: 'TR',
    pageSize,
  }
  if (pageToken) body.pageToken = pageToken

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as PlacesSearchResponse
  if (!res.ok) {
    const message =
      json.error?.message ||
      (typeof (json as { error?: unknown }).error === 'string'
        ? String((json as { error: string }).error)
        : `Places HTTP ${res.status}`)
    throw new Error(message)
  }
  return json
}

/**
 * Google Places API (New) Text Search — kota güvenli: tek HTTP isteği, max 20 sonuç.
 */
export async function discoverWithPlacesApi(
  queryInput: string,
  options: { maxResults?: number } = {},
): Promise<ContactsDiscoverJobResult> {
  const started = Date.now()
  const query = queryInput.trim().replace(/\s+/g, ' ')
  const hardCap = env.discoverMaxResults
  const maxResults = Math.min(Math.max(options.maxResults ?? hardCap, 5), hardCap)
  const errors: string[] = []
  const apiKey = env.googleMapsApiKey

  if (!apiKey) {
    return {
      query,
      places: [],
      contacts: [],
      errors: ['GOOGLE_MAPS_API_KEY yok — Places keşfi kapalı.'],
      truncated: false,
      durationMs: Date.now() - started,
    }
  }

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

  const collected: DiscoveredPlace[] = []
  let truncated = false

  try {
    // Sayfalama YOK — her kullanıcı araması = 1 Places isteği (kota kilidi).
    log.info({ query, maxResults, pages: 1 }, 'Places Text Search (tek istek)')
    const page = await searchTextPage(apiKey, query, maxResults)
    const batch = page.places ?? []
    for (const raw of batch) {
      const mapped = mapPlace(raw)
      if (mapped) collected.push(mapped)
      if (collected.length >= maxResults) break
    }
    truncated = Boolean(page.nextPageToken) || batch.length >= maxResults
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Places araması başarısız'
    errors.push(message)
    log.error({ err: message, query }, 'Places discover hata')
  }

  const byPhone = new Map<string, DiscoveredPlace>()
  const noPhone: DiscoveredPlace[] = []
  for (const place of collected) {
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
    sourceUrl: p.website || p.mapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
    confidence: 'high' as const,
  }))

  log.info(
    {
      query,
      places: uniquePlaces.length,
      withPhone: contacts.length,
      ms: Date.now() - started,
    },
    'Places Text Search bitti',
  )

  return {
    query,
    places: uniquePlaces,
    contacts,
    errors: errors.slice(0, 12),
    truncated,
    durationMs: Date.now() - started,
  }
}
