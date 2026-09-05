export function validateCampaignSettings(min: number, max: number, cap: number): string | null {
  if (![min, max, cap].every(Number.isSafeInteger)) return 'Bekleme süreleri ve günlük sınır tam sayı olmalı.'
  if (min < 3 || max > 3600 || min > max) return 'Bekleme aralığı 3–3600 saniye arasında olmalı; en kısa süre en uzun süreyi aşamaz.'
  if (cap < 1 || cap > 250) return 'Hat başına günlük sınır 1–250 arasında olmalı.'
  return null
}
export function validateMediaUrl(raw: string): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password) return 'Görsel için geçerli bir HTTPS adresi kullanın.'
    return null
  } catch { return 'Görsel adresi geçersiz.' }
}
