-- Gelen kutusu sorgulari icin indeksler
create index if not exists message_log_inbound_idx
  on public.message_log (owner_id, id desc)
  where direction = 'in';

create index if not exists message_log_phone_idx
  on public.message_log (owner_id, phone_e164, id)
  where phone_e164 is not null;
