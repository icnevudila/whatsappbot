import { jidToE164 } from '@wa/shared'
import { isJidBroadcast, isJidGroup, isJidNewsletter } from '@whiskeysockets/baileys'
import { one, query } from './db.js'
import { logger } from './logger.js'

const log = logger.child({ scope: 'account-contacts' })

export type RawWhatsAppContact = {
  id: string
  /** PN JID (@s.whatsapp.net) — LID döneminde asıl telefon burada */
  jid?: string | null
  lid?: string | null
  name?: string | null
  notify?: string | null
  verifiedName?: string | null
}

export type LidResolver = (lidJid: string) => Promise<string | null>

function pickPhoneJid(c: RawWhatsAppContact): string | null {
  // Tercih: açık PN jid → id (zaten PN ise)
  for (const candidate of [c.jid, c.id]) {
    if (!candidate) continue
    if (isJidGroup(candidate) || isJidBroadcast(candidate) || isJidNewsletter(candidate)) continue
    if (jidToE164(candidate)) return candidate
  }
  return null
}

/**
 * WhatsApp'tan (contacts.upsert, messaging-history.set vb.) gelen ham kisileri
 * filtreleyip public.account_contacts tablosuna toplu yazar.
 *
 * Modern WA çoğu kişiyi @lid id ile yollar; telefon `contact.jid` alanında gelir.
 */
export async function persistAccountContacts(
  orgId: string,
  accountId: string,
  contacts: RawWhatsAppContact[],
  resolveLid?: LidResolver,
): Promise<number> {
  if (!contacts || contacts.length === 0) return 0

  const validRows: Array<{ phone: string; jid: string; name: string | null; notify: string | null }> =
    []
  const seenPhone = new Set<string>()
  let skippedLid = 0
  let skippedOther = 0

  for (const c of contacts) {
    if (!c?.id) {
      skippedOther += 1
      continue
    }

    let phoneJid = pickPhoneJid(c)

    // id @lid ve jid yoksa mapping dene
    if (!phoneJid && resolveLid) {
      const lid = c.id.endsWith('@lid') ? c.id : c.lid?.endsWith('@lid') ? c.lid : null
      if (lid) {
        try {
          const mapped = await resolveLid(lid)
          if (mapped && jidToE164(mapped)) phoneJid = mapped
        } catch {
          /* mapping yok */
        }
      }
    }

    if (!phoneJid) {
      if (c.id.endsWith('@lid') || c.lid?.endsWith('@lid')) skippedLid += 1
      else skippedOther += 1
      continue
    }

    const phone = jidToE164(phoneJid)
    if (!phone) {
      skippedOther += 1
      continue
    }
    if (seenPhone.has(phone)) continue
    seenPhone.add(phone)

    const name = c.name?.trim() || c.verifiedName?.trim() || null
    const notify = c.notify?.trim() || null
    validRows.push({ phone, jid: phoneJid, name, notify })
  }

  if (validRows.length === 0) {
    log.info(
      { accountId, input: contacts.length, skippedLid, skippedOther },
      'account_contacts: telefon cikarilabilen kisi yok',
    )
    return 0
  }

  let inserted = 0
  const BATCH_SIZE = 200

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE)

    const values: unknown[] = []
    const placeholders: string[] = []

    for (const row of batch) {
      const idx = values.length
      values.push(orgId, accountId, row.phone, row.jid, row.name, row.notify)
      placeholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6})`)
    }

    const sql = `
      insert into public.account_contacts (org_id, account_id, phone_e164, wa_jid, name, notify)
      values ${placeholders.join(', ')}
      on conflict (account_id, phone_e164) do update
         set name = coalesce(excluded.name, public.account_contacts.name),
             notify = coalesce(excluded.notify, public.account_contacts.notify),
             wa_jid = excluded.wa_jid,
             updated_at = now()
    `

    try {
      await query(sql, values)
      inserted += batch.length
    } catch (error) {
      log.warn({ err: error, accountId, batchSize: batch.length }, 'account_contacts batch yazilamadi')
    }
  }

  log.info(
    { accountId, count: inserted, skippedLid, skippedOther, input: contacts.length },
    'WhatsApp kisileri account_contacts tablosuna kaydedildi',
  )
  return inserted
}

/**
 * public.account_contacts (ve mesaj gecmisindeki numaralari)
 * public.contacts tablosuna ekler ve "WhatsApp Rehberi" kisi listesine baglar.
 */
export async function importAccountContactsToList(options: {
  orgId: string
  createdBy?: string | null
  accountId: string
  listName?: string
}): Promise<{ imported: number; listId: string; listName: string; fromAccount: number; fromMessages: number }> {
  const { orgId, createdBy, accountId, listName } = options

  const account = await one<{ label: string; phone_e164: string | null; created_by: string }>(
    'select label, phone_e164, created_by from public.accounts where id = $1 and org_id = $2',
    [accountId, orgId],
  )

  if (!account) {
    throw new Error('Hesap bulunamadi')
  }

  const effectiveCreatedBy = createdBy || account.created_by
  const finalListName =
    listName?.trim() ||
    `WhatsApp Rehberi — ${account.label || account.phone_e164 || 'Hat'}`

  let list = await one<{ id: string; name: string }>(
    `select id::text, name from public.contact_lists
      where org_id = $1 and name = $2 limit 1`,
    [orgId, finalListName],
  )

  if (!list) {
    list = await one<{ id: string; name: string }>(
      `insert into public.contact_lists (org_id, created_by, name, description, source)
       values ($1, $2, $3, $4, 'whatsapp')
       returning id::text, name`,
      [
        orgId,
        effectiveCreatedBy,
        finalListName,
        `${account.label} (${account.phone_e164 ?? ''}) WhatsApp rehberinden ice aktarildi`,
      ],
    )
  }

  if (!list) {
    throw new Error('Kisi listesi olusturulamadi')
  }

  const counts = await one<{ from_account: string; from_messages: string }>(
    `select
       (select count(*)::text from public.account_contacts where account_id = $1) as from_account,
       (select count(distinct phone_e164)::text from public.message_log
         where account_id = $1 and phone_e164 is not null) as from_messages`,
    [accountId],
  )

  // Ayni telefon birden fazla jid ile gelmesin — telefon bazinda tek satir
  const contacts = await query<{ phone_e164: string; wa_jid: string; name: string | null }>(
    `with source_numbers as (
       select phone_e164, wa_jid, coalesce(name, notify) as name
         from public.account_contacts
        where account_id = $1
       union all
       select distinct phone_e164, remote_jid as wa_jid, null::text as name
         from public.message_log
        where account_id = $1 and phone_e164 is not null
     )
     select phone_e164,
            (array_agg(wa_jid order by wa_jid))[1] as wa_jid,
            max(name) as name
       from source_numbers
      where phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'
      group by phone_e164`,
    [accountId],
  )

  if (contacts.length === 0) {
    log.info({ accountId }, 'Ice aktarilacak WhatsApp kisi kaydi bulunamadi')
    return {
      imported: 0,
      listId: list.id,
      listName: list.name,
      fromAccount: Number(counts?.from_account ?? 0),
      fromMessages: Number(counts?.from_messages ?? 0),
    }
  }

  const BATCH_SIZE = 250
  let linkedCount = 0

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE)

    const contactValues: unknown[] = []
    const contactPlaceholders: string[] = []

    for (const c of batch) {
      const idx = contactValues.length
      contactValues.push(orgId, effectiveCreatedBy, c.phone_e164, c.name, c.wa_jid)
      contactPlaceholders.push(
        `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, 'whatsapp', 'valid', $${idx + 5}, now())`,
      )
    }

    const upsertSql = `
      insert into public.contacts
        (org_id, created_by, phone_e164, name, source, wa_status, wa_jid, wa_checked_at)
      values ${contactPlaceholders.join(', ')}
      on conflict (org_id, phone_e164) do update
         set wa_status = 'valid',
             wa_jid = coalesce(excluded.wa_jid, public.contacts.wa_jid),
             name = coalesce(public.contacts.name, excluded.name),
             updated_at = now()
      returning id::text
    `

    const insertedRows = await query<{ id: string }>(upsertSql, contactValues)
    const contactIds = insertedRows.map((r) => r.id)

    if (contactIds.length > 0) {
      const memberValues: unknown[] = []
      const memberPlaceholders: string[] = []

      for (const cid of contactIds) {
        const idx = memberValues.length
        memberValues.push(list.id, cid, orgId, effectiveCreatedBy)
        memberPlaceholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`)
      }

      const memberSql = `
        insert into public.contact_list_members (list_id, contact_id, org_id, created_by)
        values ${memberPlaceholders.join(', ')}
        on conflict (list_id, contact_id) do nothing
      `
      await query(memberSql, memberValues)
      linkedCount += contactIds.length
    }
  }

  await query(
    `update public.contact_lists
        set contact_count = (select count(*) from public.contact_list_members where list_id = $1::uuid),
            updated_at = now()
      where id = $1::uuid`,
    [list.id],
  )

  log.info(
    {
      accountId,
      listId: list.id,
      count: linkedCount,
      fromAccount: Number(counts?.from_account ?? 0),
      fromMessages: Number(counts?.from_messages ?? 0),
    },
    'WhatsApp rehberi basariyla kisi listesine aktarildi',
  )

  return {
    imported: linkedCount,
    listId: list.id,
    listName: list.name,
    fromAccount: Number(counts?.from_account ?? 0),
    fromMessages: Number(counts?.from_messages ?? 0),
  }
}
