/**
 * DB retention iskeleti — asıl temizlik Supabase cron üzerinden
 * `wa.cleanup_expired()` ile yapılır (message_log 180g, bitmiş kampanya
 * hedefleri 90g). Worker isteğe bağlı olarak aynı RPC'yi çağırabilir.
 */
import { query } from './db.js'
import { logger } from './logger.js'

const log = logger.child({ scope: 'retention' })

export type RetentionSummary = {
  ranAt: string
  note: string
}

/**
 * service_role ile `select wa.cleanup_expired()` tetikler.
 * Hata durumunda loglar; kampanya gönderimini bozmaz.
 */
export async function runRetentionCleanup(): Promise<RetentionSummary> {
  const ranAt = new Date().toISOString()
  try {
    await query('select wa.cleanup_expired()')
    log.info({ ranAt }, 'retention cleanup tamam')
    return {
      ranAt,
      note: 'wa.cleanup_expired: jobs/events + message_log(180d) + campaign_targets(90d)',
    }
  } catch (err) {
    log.error({ err, ranAt }, 'retention cleanup basarisiz')
    throw err
  }
}
