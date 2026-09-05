export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
    if (!dsn) return
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.init({
        dsn,
        tracesSampleRate: 0.05,
      })
    } catch {
      // optional
    }
  }
}
