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

  // Excel'den gelen "905321234567" gibi degerler + olmadan geliyor.
  // Basinda + yoksa ve uzunluk uluslararasi bir numaraya benziyorsa once
  // uluslararasi olarak denenir, sonra ulke varsayilaniyla.
  const candidates = trimmed.startsWith('+')
    ? [trimmed]
    : [`+${trimmed.replace(/\D/g, '')}`, trimmed]

  for (const candidate of candidates) {
    const parsed = parsePhoneNumberFromString(candidate, defaultCountry)
    if (parsed?.isValid()) return parsed.number
  }

  return null
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
