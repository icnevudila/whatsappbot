/**
 * Opsiyonel Sentry. SENTRY_DSN yoksa no-op.
 * Bagimlilik: npm i @sentry/node (wa-service workspace).
 */
let sentryReady = false

export async function initMonitoring(): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim()
  if (!dsn || sentryReady) return
  try {
    const Sentry = await import('@sentry/node')
    Sentry.init({
      dsn,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
      environment: process.env.NODE_ENV ?? 'production',
      serverName: process.env.WORKER_ID?.trim() || undefined,
    })
    sentryReady = true
    console.info('[monitoring] Sentry init OK')
  } catch {
    console.warn('[monitoring] @sentry/node yok — npm i @sentry/node ekleyin')
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!process.env.SENTRY_DSN?.trim()) return
  void import('@sentry/node')
    .then((Sentry) => {
      Sentry.captureException(error, { extra: context })
    })
    .catch(() => {
      console.error('[monitoring]', error, context ?? {})
    })
}

export async function flushMonitoring(timeoutMs = 2000): Promise<void> {
  if (!sentryReady || !process.env.SENTRY_DSN?.trim()) return
  try {
    const Sentry = await import('@sentry/node')
    await Sentry.flush(timeoutMs)
    await Sentry.close(timeoutMs)
  } catch {
    /* ignore */
  }
}
