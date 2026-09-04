-- LID (@lid) remote_jid telefon numarasi tasimaz; jidToE164 ile yazilmis
-- sahte phone_e164 degerlerini temizle (ornegin +49289111855204).
update public.message_log
   set phone_e164 = null
 where direction = 'in'
   and remote_jid like '%@lid'
   and phone_e164 is not null;
