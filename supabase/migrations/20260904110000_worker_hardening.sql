-- VT + worker sertlestirme: sequence grant, stale job reclaim, atomik target claim,
-- hot-path indexler, authenticated INSERT sertlestirme, junction owner check.

-- ---------------------------------------------------------------------------
-- 1) Panel jobs INSERT icin sequence USAGE
-- ---------------------------------------------------------------------------
grant usage, select on sequence public.jobs_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Stuck job reclaim (worker crash / degisen WORKER_ID)
-- ---------------------------------------------------------------------------
create index if not exists jobs_stale_claimed_idx
  on public.jobs (claimed_at)
  where status in ('claimed', 'running');

create or replace function wa.reclaim_stale_jobs(p_stale_seconds int default 300)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n int;
begin
  if p_stale_seconds < 30 then
    p_stale_seconds := 30;
  end if;

  update public.jobs
     set status = 'pending',
         claimed_by = null,
         claimed_at = null,
         run_after = now(),
         error = coalesce(error, 'stale reclaim'),
         updated_at = now()
   where status in ('claimed', 'running')
     and claimed_at is not null
     and claimed_at < now() - make_interval(secs => p_stale_seconds);

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function wa.reclaim_stale_jobs(int) from public, anon, authenticated;
grant execute on function wa.reclaim_stale_jobs(int) to service_role;

-- Cron: her dakika stale job geri al
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'wa-reclaim-stale-jobs') then
      perform cron.unschedule((select jobid from cron.job where jobname = 'wa-reclaim-stale-jobs' limit 1));
    end if;

    perform cron.schedule(
      'wa-reclaim-stale-jobs',
      '* * * * *',
      'select wa.reclaim_stale_jobs(300)'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron reclaim schedule skipped: %', sqlerrm;
end;
$cron$;

-- ---------------------------------------------------------------------------
-- 3) Atomik kampanya hedef claim (multi-worker cift mesaj engeli)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4) Hot-path index: stale sending reclaim
-- ---------------------------------------------------------------------------
create index if not exists campaign_targets_sending_stale_idx
  on public.campaign_targets (updated_at)
  where status = 'sending';

-- ---------------------------------------------------------------------------
-- 5) Authenticated INSERT sertlestirme
-- ---------------------------------------------------------------------------
create or replace function public.jobs_force_pending()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and coalesce((select auth.role()), '') = 'authenticated' then
    new.status := 'pending';
    new.claimed_by := null;
    new.claimed_at := null;
    new.finished_at := null;
    new.attempts := 0;
    new.result := null;
    new.error := null;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_force_pending on public.jobs;
create trigger jobs_force_pending
  before insert on public.jobs
  for each row execute function public.jobs_force_pending();

create or replace function public.campaigns_force_draft_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and coalesce((select auth.role()), '') = 'authenticated' then
    new.status := 'draft';
    new.started_at := null;
    new.paused_at := null;
    new.completed_at := null;
    new.stop_reason := null;
    new.sent_count := 0;
    new.failed_count := 0;
    new.skipped_count := 0;
    new.total_targets := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_force_draft_on_insert on public.campaigns;
create trigger campaigns_force_draft_on_insert
  before insert on public.campaigns
  for each row execute function public.campaigns_force_draft_on_insert();

create or replace function public.accounts_sanitize_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and coalesce((select auth.role()), '') = 'authenticated' then
    new.status := 'disconnected';
    new.status_detail := null;
    new.qr_code := null;
    new.qr_expires_at := null;
    new.pairing_code := null;
    new.pairing_expires_at := null;
    new.phone_e164 := null;
    new.wa_jid := null;
    new.wa_lid := null;
    new.connected_at := null;
    new.is_locked := false;
    new.lock_reason := null;
    new.locked_at := null;
    new.sent_today := 0;
    new.sent_today_on := null;
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_sanitize_insert on public.accounts;
create trigger accounts_sanitize_insert
  before insert on public.accounts
  for each row execute function public.accounts_sanitize_insert();

-- ---------------------------------------------------------------------------
-- 6) Junction owner tutarliligi
-- ---------------------------------------------------------------------------
create or replace function public.enforce_campaign_account_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.campaigns c
     where c.id = new.campaign_id and c.owner_id = new.owner_id
  ) then
    raise exception 'campaign_accounts: campaign owner mismatch';
  end if;

  if not exists (
    select 1 from public.accounts a
     where a.id = new.account_id and a.owner_id = new.owner_id
  ) then
    raise exception 'campaign_accounts: account owner mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_campaign_account_owner on public.campaign_accounts;
create trigger enforce_campaign_account_owner
  before insert or update on public.campaign_accounts
  for each row execute function public.enforce_campaign_account_owner();

create or replace function public.enforce_list_member_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.contact_lists l
     where l.id = new.list_id and l.owner_id = new.owner_id
  ) then
    raise exception 'contact_list_members: list owner mismatch';
  end if;

  if not exists (
    select 1 from public.contacts c
     where c.id = new.contact_id and c.owner_id = new.owner_id
  ) then
    raise exception 'contact_list_members: contact owner mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_list_member_owner on public.contact_list_members;
create trigger enforce_list_member_owner
  before insert or update on public.contact_list_members
  for each row execute function public.enforce_list_member_owner();

-- failed job retention: cleanup_expired genislet
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
     and coalesce(finished_at, updated_at) < now() - interval '7 days';

  delete from public.account_events where created_at < now() - interval '30 days';
end;
$$;

revoke all on function wa.cleanup_expired() from public, anon, authenticated;
grant execute on function wa.cleanup_expired() to service_role;
