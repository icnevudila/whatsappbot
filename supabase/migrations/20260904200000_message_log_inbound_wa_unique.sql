-- Gelen mesajlarda (account_id, wa_message_id) tekil — cift insert yarısını engeller.
create unique index if not exists message_log_inbound_wa_id_uq
  on public.message_log (account_id, wa_message_id)
  where direction = 'in' and wa_message_id is not null;
