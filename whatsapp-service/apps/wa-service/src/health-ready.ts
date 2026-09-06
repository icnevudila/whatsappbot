/** Worker /ready matrisi — test edilebilir saf fonksiyon. */
export function computeWorkerReady(input: {
  dbOk: boolean
  tracked: number
  live: number
  staleCount: number
}): { healthy: boolean; ready: boolean; degraded: boolean } {
  const healthy = input.dbOk
  const degraded = input.staleCount > 0 || (input.tracked > 0 && input.live === 0)
  const ready =
    input.dbOk && (input.tracked === 0 || input.live > 0) && input.staleCount === 0
  return { healthy, ready, degraded }
}
