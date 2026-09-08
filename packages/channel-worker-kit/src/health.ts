/** Kanal worker /health|/ready matrisi — saf, test edilebilir. */
export function computeChannelReady(input: {
  dbOk: boolean
  draining: boolean
  liveAccounts: number
  errorAccounts: number
}): { healthy: boolean; ready: boolean; degraded: boolean } {
  if (input.draining) {
    return { healthy: true, ready: false, degraded: false }
  }

  const healthy = input.dbOk
  const degraded = input.errorAccounts > 0
  // idle (live=0, error=0) veya en az bir canli hesap → ready
  // tum hesaplar hatali (live=0, error>0) → not ready
  const ready = input.dbOk && !(input.liveAccounts === 0 && input.errorAccounts > 0)

  return { healthy, ready, degraded }
}
