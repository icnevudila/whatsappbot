/** Worker /ready matrisi — test edilebilir saf fonksiyon. */
export function computeWorkerReady(input: {
  dbOk: boolean
  tracked: number
  live: number
  staleCount: number
  /** Resume / reconnect penceresi — live henüz yok ama oturum bağlanıyor. */
  connectingCount?: number
}): { healthy: boolean; ready: boolean; degraded: boolean } {
  const connecting = input.connectingCount ?? 0
  const healthy = input.dbOk
  const degraded =
    input.staleCount > 0 || (input.tracked > 0 && input.live === 0 && connecting === 0)
  // Tek stale tüm worker'ı ready=false yapmasın; canlı oturum varken degraded yeter.
  // Boot'ta connecting>0 iken de ready kalsın (compose start_period sonrası fail olmasın).
  const ready =
    input.dbOk &&
    (input.tracked === 0 || input.live > 0 || connecting > 0)
  return { healthy, ready, degraded }
}
