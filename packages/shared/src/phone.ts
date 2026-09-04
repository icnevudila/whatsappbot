import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

export const DEFAULT_COUNTRY: CountryCode = 'TR'

/**
 * Serbest metni E.164'e cevirir, olmuyorsa null doner.
 * Numaralar veritabaninda her zaman E.164 olarak saklanir; contacts tablosunda
 * bunu zorlayan bir CHECK kisiti var.
 */
export function toE164(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Acik ulke kodu (+90...) varsa oldugu gibi dene.
  if (trimmed.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(trimmed)
    return parsed?.isValid() ? parsed.number : null
  }

  // Ulke kodsuz giris: ONCE varsayilan ulke (TR).
  // Aksi halde "5344272751" once +5344... diye okunup Kuba (+53) saniliyor.
  const asNational = parsePhoneNumberFromString(trimmed, defaultCountry)
  if (asNational?.isValid()) return asNational.number

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  // "905344272751" gibi +suz ama ulke kodlu yazim.
  const asIntl = parsePhoneNumberFromString(`+${digits}`)
  if (asIntl?.isValid()) return asIntl.number

  return null
}

/**
 * Web scraper için: yüksek güven (tel:/schema) çok ülkeli deneme;
 * metin adayları yalnızca TR mobil veya açık uluslararası biçim.
 */
export function toE164Scraped(
  raw: string,
  confidence: 'high' | 'medium' = 'high',
): string | null {
  const trimmed = raw.trim().replace(/^tel:/i, '')
  if (!trimmed) return null

  const compact = trimmed.replace(/\s+/g, '')
  if (compact.startsWith('+') || compact.startsWith('00')) {
    const normalized = compact.startsWith('00')
      ? `+${compact.slice(2).replace(/\D/g, '')}`
      : trimmed
    const e164 = toE164(normalized)
    // Metin adayları: açık + olsa bile yalnız TR mobil (WhatsApp listesi).
    if (confidence === 'medium') {
      if (e164 && /^905\d{9}$/.test(e164.replace(/\D/g, ''))) return e164
      return null
    }
    return e164
  }

  const digits = trimmed.replace(/\D/g, '')

  if (confidence === 'medium') {
    if (/^0?5\d{9}$/.test(digits)) return toE164(digits)
    if (/^905\d{9}$/.test(digits)) return toE164(`+${digits}`)
    return null
  }

  // TR ulusal (0 ile) veya mobil (5…) veya 90… — çıplak 408… gibi ABD kodlarından önce.
  if (/^0[2-5]\d{9}$/.test(digits) || /^5\d{9}$/.test(digits) || /^90[2-5]\d{9}$/.test(digits)) {
    const tr = toE164(trimmed.startsWith('90') && !trimmed.startsWith('+') ? `+${digits}` : trimmed)
    if (tr) return tr
  }

  // TR sabit hat (0'suz alan kodu). libphonenumber 408'i yanlis TR sayabildigi icin
  // yalnizca gercek TR alan kodlarini kabul et; aksi NANP'e dusun.
  const TR_AREA =
    /^(212|216|222|224|226|228|232|236|242|246|248|252|256|258|262|264|266|272|274|276|282|284|286|288|312|318|322|324|326|328|332|338|342|344|346|348|352|354|356|358|362|364|366|368|370|372|374|376|378|380|382|384|386|388|392|412|414|416|422|424|426|428|432|434|436|438|442|446|452|454|456|458|462|464|466|472|474|476|478|482|484|486|488)/
  if (/^[2-4]\d{9}$/.test(digits) && TR_AREA.test(digits)) {
    const tr = parsePhoneNumberFromString(trimmed, 'TR')
    if (tr?.isValid()) return tr.number
  }

  // NANP (ABD/CA): 10 hane 2-9…
  if (/^1?[2-9]\d{9}$/.test(digits)) {
    const nanp = parsePhoneNumberFromString(trimmed, 'US')
    if (nanp?.isValid()) return nanp.number
  }

  const countries: CountryCode[] = ['GB', 'DE', 'FR', 'NL', 'TR', 'US']
  for (const country of countries) {
    const parsed = parsePhoneNumberFromString(trimmed, country)
    if (parsed?.isValid()) return parsed.number
  }

  if (digits.length >= 10 && digits.length <= 15) {
    const intl = parsePhoneNumberFromString(`+${digits}`)
    if (intl?.isValid()) return intl.number
  }

  return toE164(trimmed)
}

/** WhatsApp JID'inden E.164 uretir. LID'ler telefon numarasi tasimadigi icin atlanir. */
export function jidToE164(jid: string): string | null {
  const user = jid.split('@')[0]?.split(':')[0]
  if (!user || !/^\d+$/.test(user)) return null
  return toE164(`+${user}`)
}

/** E.164'ten WhatsApp PN JID'i uretir. */
export function e164ToJid(e164: string): string {
  return `${e164.replace(/\D/g, '')}@s.whatsapp.net`
}

export type ImportedRow = {
  phone_e164: string
  name: string | null
}

export type ImportResult = {
  valid: ImportedRow[]
  invalid: string[]
  duplicates: number
}

/**
 * Metin blogunu (yapistirilmis liste veya CSV kolonu) numaralara cevirir.
 * Ayni numara birden fazla gecerse bir kez tutulur.
 */
export function parsePhoneList(
  input: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): ImportResult {
  const seen = new Set<string>()
  const valid: ImportedRow[] = []
  const invalid: string[] = []
  let duplicates = 0

  for (const line of input.split(/\r?\n/)) {
    const row = line.trim()
    if (!row) continue

    // "numara,isim" veya "numara;isim" veya sadece numara
    const [rawPhone, ...rest] = row.split(/[,;\t]/)
    if (!rawPhone) continue

    const phone = toE164(rawPhone, defaultCountry)
    if (!phone) {
      invalid.push(row)
      continue
    }

    if (seen.has(phone)) {
      duplicates += 1
      continue
    }

    seen.add(phone)
    valid.push({ phone_e164: phone, name: rest.join(' ').trim() || null })
  }

  return { valid, invalid, duplicates }
}
