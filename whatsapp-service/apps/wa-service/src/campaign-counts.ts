/** Panel sent_count: basariyla giden + receipt ile ilerlemis hedefler. */
export const CAMPAIGN_SENT_STATUSES = ['sent', 'delivered', 'read'] as const

/** reconcileCampaignCounts icindeki SQL filter — test ile senkron tutulur. */
export const CAMPAIGN_SENT_SQL_IN = `status in ('sent', 'delivered', 'read')`

export type CampaignStatusBuckets = {
  sent: number
  failed: number
  skipped: number
}

/**
 * Hedef status listesinden panel sayaclarini turetir.
 * reconcileCampaignCounts SQL filtresi ile ayni kurallar.
 */
export function countCampaignStatusBuckets(
  statuses: Iterable<string>,
): CampaignStatusBuckets {
  let sent = 0
  let failed = 0
  let skipped = 0
  for (const status of statuses) {
    if ((CAMPAIGN_SENT_STATUSES as readonly string[]).includes(status)) sent += 1
    else if (status === 'failed') failed += 1
    else if (status === 'skipped') skipped += 1
  }
  return { sent, failed, skipped }
}

/**
 * Kampanya sayaclarini hedef durumlarindan turetir.
 * Artirim kacsa bile (restart / timeout / receipt) dogrular.
 * DB import'u cagri aninda: birim testler env istemez.
 */
export async function reconcileCampaignCounts(campaignId: string): Promise<void> {
  const { query } = await import('./db.js')
  // sent_count = basariyla giden hedefler (receipt ile delivered/read olsa da sayilir).
  // Eski hali yalnizca status='sent' saydigi icin teslim/okundu sonrasi sayac dusuyordu.
  await query(
    `update public.campaigns c
        set sent_count = coalesce(s.sent, 0),
            failed_count = coalesce(s.failed, 0),
            skipped_count = coalesce(s.skipped, 0),
            updated_at = now()
       from (
         select count(*) filter (where ${CAMPAIGN_SENT_SQL_IN}) as sent,
                count(*) filter (where status = 'failed') as failed,
                count(*) filter (where status = 'skipped') as skipped
           from public.campaign_targets
          where campaign_id = $1::uuid
       ) s
      where c.id = $1::uuid`,
    [campaignId],
  )
}
