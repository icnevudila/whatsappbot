-- campaign_bulk_reply migration
-- 1. campaign_targets tablosuna yanit alanlari
alter table public.campaign_targets
  add column if not exists replied_at timestamptz,
  add column if not exists last_inbound_text text,
  add column if not exists reply_status text not null default 'none';

create index if not exists campaign_targets_reply_idx
  on public.campaign_targets (campaign_id, reply_status)
  where reply_status = 'waiting_reply';

grant select, update (replied_at, last_inbound_text, reply_status) on public.campaign_targets to authenticated;

-- 2. get_campaign_pending_replies RPC
create or replace function public.get_campaign_pending_replies(p_campaign_id uuid)
returns table (
  target_id bigint,
  contact_id uuid,
  contact_name text,
  phone_e164 text,
  replied_at timestamptz,
  last_inbound_text text,
  suggested_reply text,
  intent_label text
) language plpgsql security definer as $$
begin
  return query
  select 
    ct.id as target_id,
    ct.contact_id,
    coalesce(c.name, ct.phone_e164) as contact_name,
    ct.phone_e164,
    ct.replied_at,
    ct.last_inbound_text,
    coalesce(sl.suggestions->0->>'text', 'Merhaba, mesajınız için teşekkür ederiz. Size nasıl yardımcı olabiliriz?') as suggested_reply,
    coalesce(sl.suggestions->0->>'label', 'Genel Yanıt') as intent_label
  from public.campaign_targets ct
  left join public.contacts c on c.id = ct.contact_id
  left join lateral (
    select suggestions from public.ai_reply_suggestion_library l
    where l.org_id = ct.org_id
      and l.incoming_sample ilike '%' || left(ct.last_inbound_text, 40) || '%'
    order by l.created_at desc limit 1
  ) sl on true
  where ct.campaign_id = p_campaign_id
    and ct.reply_status = 'waiting_reply'
  order by ct.replied_at desc;
end;
$$;

grant execute on function public.get_campaign_pending_replies(uuid) to authenticated;

-- 3. jobs_type_check genisletme
alter table public.jobs drop constraint if exists jobs_type_check;
alter table public.jobs
  add constraint jobs_type_check check (type in (
    'account.connect',
    'account.disconnect',
    'account.logout',
    'account.request_pairing_code',
    'account.sync_contacts',
    'message.send',
    'contacts.verify',
    'contacts.check_phone',
    'contacts.scrape',
    'contacts.discover',
    'creative.render',
    'campaign.start',
    'campaign.pause',
    'campaign.resume',
    'campaign.stop',
    'campaign.refresh_targets',
    'campaign.bulk_reply',
    'service.restart'
  ));
