-- Kampanya hedeflerinde message.send ile ayni cift-gonderim guvenligi:
-- Baileys sendMessage cagrilmadan once delivery_attempted = true;
-- reclaim / retry bu bayrakli satirlari yeniden gondermez.

alter table public.campaign_targets
  add column if not exists delivery_attempted boolean not null default false;

comment on column public.campaign_targets.delivery_attempted is
  'Baileys sendMessage cagrisi yapildi (veya yapilmak uzere isaretlendi). true iken otomatik tekrar yasak.';

-- Claim asla daha once gonderim denenmis satirlari almasin (yanlis queued durumu).
create or replace function wa.claim_campaign_target(
  p_campaign_id uuid,
  p_account_id uuid
)
returns table (
  id bigint,
  phone_e164 text,
  contact_id uuid,
  contact_name text,
  wa_status text,
  wa_jid text
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select t.id
      from public.campaign_targets t
     where t.campaign_id = p_campaign_id
       and t.status = 'queued'
       and t.delivery_attempted = false
       and (t.scheduled_for is null or t.scheduled_for <= now())
     order by t.id
     limit 1
     for update skip locked
  )
  update public.campaign_targets t
     set status = 'sending',
         account_id = p_account_id,
         attempts = t.attempts + 1,
         updated_at = now()
    from candidate c
   where t.id = c.id
  returning
    t.id,
    t.phone_e164,
    t.contact_id,
    (select ct.name from public.contacts ct where ct.id = t.contact_id) as contact_name,
    (select ct.wa_status from public.contacts ct where ct.id = t.contact_id) as wa_status,
    (select ct.wa_jid from public.contacts ct where ct.id = t.contact_id) as wa_jid;
end;
$$;

revoke all on function wa.claim_campaign_target(uuid, uuid) from public, anon, authenticated;
grant execute on function wa.claim_campaign_target(uuid, uuid) to service_role;
