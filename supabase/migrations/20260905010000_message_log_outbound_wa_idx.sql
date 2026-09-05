-- Receipt / outbound lookup: account_id + wa_message_id (messages.update).
create index if not exists message_log_outbound_wa_id_idx
  on public.message_log (account_id, wa_message_id)
  where direction = 'out' and wa_message_id is not null;

create index if not exists campaign_targets_wa_message_id_idx
  on public.campaign_targets (account_id, wa_message_id)
  where wa_message_id is not null;
