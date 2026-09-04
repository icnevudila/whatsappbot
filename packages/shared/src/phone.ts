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
