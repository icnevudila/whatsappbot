import type { JobPayloadMap } from '@wa/shared'
import { query } from './db.js'
import { logger } from './logger.js'
import { sessionManager } from './session-manager.js'
import type { WhatsAppSession } from './session.js'

const log = logger.child({ scope: 'verify' })

/** onWhatsApp cagrilari tek seferde bu kadar numara tasiyor. */
const BATCH_SIZE = 20
const BATCH_DELAY_MS = 1_500

/** Dogrulama sonucu bu sureden eskiyse yeniden sorulur. */
const CACHE_TTL_DAYS = 30

export type VerifySummary = {
  checked: number
  valid: number
  invalid: number
}

/** Bu kullaniciya ait canli bir oturum bulur; dogrulama bagli bir hesap ister. */
export function findLiveSessionForOwner(ownerId: string): WhatsAppSession | undefined {
  return sessionManager.liveSessions().find((session) => session.ownerId === ownerId)
}

export async function verifyContacts(
  ownerId: string,
  payload: JobPayloadMap['contacts.verify'],
): Promise<VerifySummary> {
  const session = findLiveSessionForOwner(ownerId)
  if (!session) {
    throw new Error('Dogrulama icin bagli bir WhatsApp hesabi gerekiyor')
  }

  const rows = await selectPending(ownerId, payload)
  if (rows.length === 0) {
    return { checked: 0, valid: 0, invalid: 0 }
  }

  log.info({ ownerId, count: rows.length }, 'Numara dogrulamasi basliyor')

  const summary: VerifySummary = { checked: 0, valid: 0, invalid: 0 }

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE)
    const phones = batch.map((row) => row.phone_e164)

    const verdicts = await session.verifyNumbers(phones)

    const ids: string[] = []
    const statuses: string[] = []
    const jids: (string | null)[] = []

    for (const row of batch) {
      const verdict = verdicts.get(row.phone_e164)
      const exists = verdict?.exists === true

      ids.push(row.id)
      statuses.push(exists ? 'valid' : 'invalid')
      jids.push(verdict?.jid ?? null)

      summary.checked += 1
      if (exists) summary.valid += 1
      else summary.invalid += 1
    }

    await query(
      `update public.contacts c
          set wa_status = t.status,
              wa_jid = t.jid,
              wa_checked_at = now(),
              updated_at = now()
         from unnest($1::uuid[], $2::text[], $3::text[]) as t(id, status, jid)
        where c.id = t.id`,
      [ids, statuses, jids],
    )

    if (index + BATCH_SIZE < rows.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  log.info({ ownerId, ...summary }, 'Numara dogrulamasi bitti')
  return summary
}

type PendingContact = { id: string; phone_e164: string }

async function selectPending(
  ownerId: string,
  payload: JobPayloadMap['contacts.verify'],
): Promise<PendingContact[]> {
  const staleBefore = `${CACHE_TTL_DAYS} days`

  if (payload.contact_ids?.length) {
    return query<PendingContact>(
      `select id, phone_e164
         from public.contacts
        where owner_id = $1
          and id = any($2::uuid[])`,
      [ownerId, payload.contact_ids],
    )
  }

  if (payload.list_id) {
    return query<PendingContact>(
      `select c.id, c.phone_e164
         from public.contacts c
         join public.contact_list_members m on m.contact_id = c.id
        where c.owner_id = $1
          and m.list_id = $2
          and (c.wa_status = 'unknown' or c.wa_checked_at < now() - $3::interval)`,
      [ownerId, payload.list_id, staleBefore],
    )
  }

  return query<PendingContact>(
    `select id, phone_e164
       from public.contacts
      where owner_id = $1
        and (wa_status = 'unknown' or wa_checked_at < now() - $2::interval)
      limit 500`,
    [ownerId, staleBefore],
  )
}
