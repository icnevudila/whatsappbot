-- VT şema güçlendirme + owner self-serve org silme
-- Not: tenancy sonrası FK adları *_owner_id_fkey kaldı ama kolon adı created_by.

-- ---------------------------------------------------------------------------
-- 1) P0 — fleet heartbeat sızıntısını kapat
-- ---------------------------------------------------------------------------
create or replace function public.worker_fleet_status()
returns jsonb
language plpgsql
security definer
set search_path = public, wa
as $$
declare
  v_uid uuid := auth.uid();
  v_alive interval := interval '90 seconds';
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  return jsonb_build_object(
    'workers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'worker_id', h.worker_id,
        'max_sessions', h.max_sessions,
        'tracked', h.tracked,
        'live', h.live,
        'db_pool_max', h.db_pool_max,
        'seen_at', h.seen_at,
        'alive', h.seen_at > now() - v_alive,
        'meta', h.meta
      ) order by h.seen_at desc)
      from wa.worker_heartbeat h
      where h.worker_id in (
        select distinct sl.holder_id
        from wa.session_lease sl
        join public.accounts a on a.id = sl.account_id
        join public.organization_members m
          on m.org_id = a.org_id and m.user_id = v_uid
        where sl.holder_id is not null
          and sl.expires_at > now()
      )
    ), '[]'::jsonb),
    'leases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'account_id', a.id,
        'label', a.label,
        'phone_e164', a.phone_e164,
        'status', a.status,
        'holder_id', sl.holder_id,
        'lease_active', sl.expires_at > now()
      ) order by a.label)
      from public.accounts a
      join public.organization_members m on m.org_id = a.org_id and m.user_id = v_uid
      left join wa.session_lease sl on sl.account_id = a.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.worker_fleet_status() from public;
grant execute on function public.worker_fleet_status() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) P1 — unindexed FK’ler (kolon: created_by / invited_by / active_org_id)
-- ---------------------------------------------------------------------------
create index if not exists account_events_created_by_idx on public.account_events (created_by);
create index if not exists accounts_created_by_idx on public.accounts (created_by);
create index if not exists auto_reply_rules_created_by_idx on public.auto_reply_rules (created_by);
create index if not exists blacklist_created_by_idx on public.blacklist (created_by);
create index if not exists brand_kits_created_by_idx on public.brand_kits (created_by);
create index if not exists campaign_accounts_created_by_idx on public.campaign_accounts (created_by);
create index if not exists campaign_targets_created_by_idx on public.campaign_targets (created_by);
create index if not exists campaigns_created_by_idx on public.campaigns (created_by);
create index if not exists contact_list_members_created_by_idx on public.contact_list_members (created_by);
create index if not exists contact_lists_created_by_idx on public.contact_lists (created_by);
create index if not exists contacts_created_by_idx on public.contacts (created_by);
create index if not exists creatives_created_by_idx on public.creatives (created_by);
create index if not exists message_log_created_by_idx on public.message_log (created_by);
create index if not exists org_api_keys_created_by_idx on public.org_api_keys (created_by);
create index if not exists org_api_keys_org_id_idx on public.org_api_keys (org_id);
create index if not exists org_invites_invited_by_idx on public.org_invites (invited_by);
create index if not exists profiles_active_org_id_idx on public.profiles (active_org_id);

-- ---------------------------------------------------------------------------
-- 3) P1 — jobs.org_id NOT NULL
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from public.jobs where org_id is null) then
    raise exception 'jobs.org_id NOT NULL blocked: null rows exist';
  end if;
end $$;

alter table public.jobs
  alter column org_id set not null;

-- ---------------------------------------------------------------------------
-- 4) P1 — org tutarlılık trigger’ları
-- ---------------------------------------------------------------------------
create or replace function public.enforce_campaign_target_org()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.campaigns c
     where c.id = new.campaign_id and c.org_id = new.org_id
  ) then
    raise exception 'campaign_targets: campaign org mismatch';
  end if;

  if new.account_id is not null and not exists (
    select 1 from public.accounts a
     where a.id = new.account_id and a.org_id = new.org_id
  ) then
    raise exception 'campaign_targets: account org mismatch';
  end if;

  if new.contact_id is not null and not exists (
    select 1 from public.contacts c
     where c.id = new.contact_id and c.org_id = new.org_id
  ) then
    raise exception 'campaign_targets: contact org mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_campaign_target_org on public.campaign_targets;
create trigger enforce_campaign_target_org
  before insert or update on public.campaign_targets
  for each row execute function public.enforce_campaign_target_org();

create or replace function public.enforce_creative_org()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.brand_kit_id is not null and not exists (
    select 1 from public.brand_kits b
     where b.id = new.brand_kit_id and b.org_id = new.org_id
  ) then
    raise exception 'creatives: brand_kit org mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_creative_org on public.creatives;
create trigger enforce_creative_org
  before insert or update on public.creatives
  for each row execute function public.enforce_creative_org();

create or replace function public.enforce_message_log_org()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.account_id is not null and not exists (
    select 1 from public.accounts a
     where a.id = new.account_id and a.org_id = new.org_id
  ) then
    raise exception 'message_log: account org mismatch';
  end if;

  if new.campaign_id is not null and not exists (
    select 1 from public.campaigns c
     where c.id = new.campaign_id and c.org_id = new.org_id
  ) then
    raise exception 'message_log: campaign org mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_message_log_org on public.message_log;
create trigger enforce_message_log_org
  before insert or update on public.message_log
  for each row execute function public.enforce_message_log_org();

create or replace function public.enforce_job_org()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.account_id is not null and not exists (
    select 1 from public.accounts a
     where a.id = new.account_id and a.org_id = new.org_id
  ) then
    raise exception 'jobs: account org mismatch';
  end if;

  if new.campaign_id is not null and not exists (
    select 1 from public.campaigns c
     where c.id = new.campaign_id and c.org_id = new.org_id
  ) then
    raise exception 'jobs: campaign org mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_job_org on public.jobs;
create trigger enforce_job_org
  before insert or update on public.jobs
  for each row execute function public.enforce_job_org();

-- ---------------------------------------------------------------------------
-- 5) P1 — outbound message tekilliği
-- ---------------------------------------------------------------------------
create unique index if not exists message_log_outbound_wa_uq
  on public.message_log (account_id, wa_message_id)
  where direction = 'out' and wa_message_id is not null and account_id is not null;

-- ---------------------------------------------------------------------------
-- 6) P2 — RLS policy birleştirme
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_org_peers" on public.profiles;
drop policy if exists "profiles_select_member" on public.profiles;
create policy "profiles_select_member" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.organization_members me
      join public.organization_members peer on peer.org_id = me.org_id
      where me.user_id = (select auth.uid())
        and peer.user_id = profiles.id
    )
  );

drop policy if exists "auto_reply_write_admin" on public.auto_reply_rules;
drop policy if exists "auto_reply_update_admin" on public.auto_reply_rules;
drop policy if exists "auto_reply_delete_admin" on public.auto_reply_rules;

create policy "auto_reply_write_admin" on public.auto_reply_rules
  for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy "auto_reply_update_admin" on public.auto_reply_rules
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy "auto_reply_delete_admin" on public.auto_reply_rules
  for delete to authenticated
  using (public.is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- 7) P2 — retention
-- ---------------------------------------------------------------------------
create or replace function wa.cleanup_expired()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from wa.sent_messages where created_at < now() - interval '7 days';
  delete from wa.session_lease where expires_at < now() - interval '1 hour';

  delete from public.jobs
   where status in ('done', 'cancelled', 'failed')
     and coalesce(finished_at, updated_at) < now() - interval '30 days';

  delete from public.account_events where created_at < now() - interval '90 days';
  delete from public.message_log where created_at < now() - interval '180 days';
end;
$$;

revoke all on function wa.cleanup_expired() from public, anon, authenticated;
grant execute on function wa.cleanup_expired() to service_role;

-- ---------------------------------------------------------------------------
-- 8) Owner self-serve org silme
-- ---------------------------------------------------------------------------
create or replace function public.delete_organization(
  p_org_id uuid,
  p_confirm_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_role text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select o.name, m.role
    into v_name, v_role
  from public.organizations o
  join public.organization_members m
    on m.org_id = o.id and m.user_id = v_uid
  where o.id = p_org_id;

  if v_name is null then
    raise exception 'org not found';
  end if;

  if v_role is distinct from 'owner' then
    raise exception 'only owner can delete organization';
  end if;

  if lower(trim(coalesce(p_confirm_name, ''))) is distinct from lower(trim(v_name)) then
    raise exception 'confirm name mismatch';
  end if;

  delete from public.organizations where id = p_org_id;
end;
$$;

revoke all on function public.delete_organization(uuid, text) from public;
grant execute on function public.delete_organization(uuid, text) to authenticated;

comment on function public.delete_organization(uuid, text) is
  'Owner-only hard delete. Confirm with exact org name. Stripe aboneliği ayrıca Portal’dan iptal edilmeli.';
