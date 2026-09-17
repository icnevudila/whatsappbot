import { one } from './db.js'

/**
 * Bu telefon numarasi ile bu hesapta daha once LID uzerinden konusulmus mu kontrol eder.
 * WhatsApp, karsi taraf LID ile mesaj baslatmissa o sohbetteki Signal ratchet oturumunu LID'e baglar.
 * Bu durumda PN (@s.whatsapp.net) adresine gonderilen mesajlar alici tarafinda cozulmez
 * ve "Mesaj bekleniyor. Bu biraz zaman alabilir." uyarisi olusur.
 *
 * Bu fonksiyon, verilen telefonun tum varyasyonlarini (+90..., 90..., 05..., son 10 hane)
 * hem message_log hem de account_contacts tablolarinda tarayarak aktif @lid JID'sini tespit eder.
 */
export async function findActiveLidForPhone(
  accountId: string,
  phone: string,
): Promise<string | null> {
  if (!accountId || !phone) return null

  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  const last10 = digits.slice(-10)
  const withPlus = `+${digits}`

  const row = await one<{ remote_jid: string }>(
    `select remote_jid from (
       select remote_jid, created_at from public.message_log
        where account_id = $1
          and remote_jid like '%@lid'
          and (
            phone_e164 in ($2, $3, $4)
            or ($5 <> '' and right(regexp_replace(phone_e164, '\\D', '', 'g'), 10) = $5)
          )
       union all
       select wa_jid as remote_jid, updated_at as created_at from public.account_contacts
        where account_id = $1
          and wa_jid like '%@lid'
          and (
            phone_e164 in ($2, $3, $4)
            or ($5 <> '' and right(regexp_replace(phone_e164, '\\D', '', 'g'), 10) = $5)
          )
     ) sub
     order by created_at desc
     limit 1`,
    [accountId, phone, withPlus, digits, last10],
  )

  return row?.remote_jid ?? null
}

/**
 * Verilen LID JID'sinin hangi telefon numarasina ait oldugunu bulur.
 */
export async function findPhoneForLid(
  accountId: string,
  lidJid: string,
): Promise<string | null> {
  if (!accountId || !lidJid) return null

  const row = await one<{ phone_e164: string }>(
    `select phone_e164 from (
       select phone_e164, created_at from public.message_log
        where account_id = $1 and remote_jid = $2 and phone_e164 is not null
       union all
       select phone_e164, updated_at as created_at from public.account_contacts
        where account_id = $1 and wa_jid = $2 and phone_e164 is not null
     ) sub
     order by created_at desc
     limit 1`,
    [accountId, lidJid],
  )

  return row?.phone_e164 ?? null
}
