/**
 * Opsiyonel Sentry — SENTRY_DSN yoksa no-op.
 * Tam @sentry/node bagimliligi yerine fetch ile minimal envelope (iskelet).
 * Uretimde tercih: @sentry/node ekleyin; bu log + health bayragi yeter.
 */
export function initMonitoring(): void {
  const dsn = process.env.SENTRY_DSN?.trim()
  if (!dsn) return
  console.info('[monitoring] SENTRY_DSN set — wire @sentry/node for full capture')
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  const dsn = process.env.SENTRY_DSN?.trim()
  if (!dsn) return
  console.error('[monitoring]', error, context ?? {})
}
