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

/** A/B yüzdesi ve B metni; 0 = kapalı. */
export function validateAbSettings(abPercent: number, bodyB: string): string | null {
  if (!Number.isSafeInteger(abPercent) || abPercent < 0 || abPercent > 100) {
    return 'A/B yüzdesi 0–100 arasında tam sayı olmalı.'
  }
  if (abPercent > 0 && !bodyB.trim()) {
    return 'A/B açıksa B varyantı metni gerekli.'
  }
  if (bodyB.length > 4096) return 'B varyantı 4096 karakteri aşamaz.'
  return null
}

/** Zamanlama: schedule modunda gelecekte bir an zorunlu. */
export function validateSchedule(startMode: string, scheduledAtRaw: string): string | null {
  if (startMode !== 'schedule') return null
  const raw = scheduledAtRaw.trim()
  if (!raw) return 'Zamanlanmış başlangıç için tarih/saat seçin.'
  const at = new Date(raw)
  if (Number.isNaN(at.getTime())) return 'Zamanlama tarihi geçersiz.'
  if (at.getTime() <= Date.now() + 60_000) {
    return 'Zamanlama en az 1 dakika sonrası olmalı.'
  }
  return null
}
