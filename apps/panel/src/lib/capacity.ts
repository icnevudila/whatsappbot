/**
 * Isindirma egrisi ve gunluk kalan kota hesabi.
 *
 * apps/wa-service/src/campaign-runner.ts icindeki warmupCap ile birebir ayni
 * olmali. Panel daha iyimser bir sayi gosterirse kullanici gonderimin neden
 * durdugunu anlayamaz; ikisinin ayrilmasi en sinsi hata sinifi.
 */
export function warmupCap(warmupStartedAt: string | null): number {
  if (!warmupStartedAt) return 10

  const days = Math.floor(
    (Date.now() - new Date(warmupStartedAt).getTime()) / (24 * 60 * 60 * 1_000),
  )

  if (days < 1) return 10
  if (days < 3) return 25
  if (days < 7) return 60
  if (days < 14) return 120
  return 250
}

export type CapacityInput = {
  daily_send_limit: number
  sent_today: number
  sent_today_on: string | null
  warmup_started_at: string | null
  new_chat_quota_total?: number | null
  new_chat_quota_used?: number | null
}

/** Bugun bu hattan kac mesaj daha cikabilir. */
export function remainingToday(account: CapacityInput): number {
  const today = new Date().toISOString().slice(0, 10)
  const sent = account.sent_today_on === today ? account.sent_today : 0

  let cap = Math.min(account.daily_send_limit, warmupCap(account.warmup_started_at))

  // WhatsApp'in bildirdigi gercek "yeni sohbet" kotasi her seyin ustunde:
  // bu tukendiginde gonderime devam etmek 463 time-lock getiriyor.
  const total = account.new_chat_quota_total
  const used = account.new_chat_quota_used
  if (typeof total === 'number' && typeof used === 'number') {
    cap = Math.min(cap, Math.max(0, total - used) + sent)
  }

  return Math.max(0, cap - sent)
}

/** Bugunku tavan (kullanilmis + kalan). Ilerleme cubugu icin. */
export function capToday(account: CapacityInput): number {
  return Math.min(account.daily_send_limit, warmupCap(account.warmup_started_at))
}
