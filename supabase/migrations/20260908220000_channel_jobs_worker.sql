-- Kanal worker kuyrugu (WhatsApp public.jobs'tan ayri; ayni ozen: claim/skip locked).

create table if not exists public.channel_jobs (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations (id) on delete cascade,
  channel_account_id uuid references public.channel_accounts (id) on delete cascade,
  channel text not null,
  type text not null
    check (type in (
      'channel.send',
      'channel.sync',
      'channel.lookup',
      'channel.qna.answer',
      'channel.webhook.process'
    )),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'running', 'done', 'failed', 'cancelled')),
  priority int not null default 100,
  run_after timestamptz not null default now(),
  attempts int not null default 0 check (attempts >= 0),
  max_attempts int not null default 3 check (max_attempts > 0),
  claimed_by text,
  claimed_at timestamptz,
  finished_at timestamptz,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists channel_jobs_queue_idx
  on public.channel_jobs (priority, run_after, id)
  where status = 'pending';

create index if not exists channel_jobs_org_idx
  on public.channel_jobs (org_id, id desc);

create index if not exists channel_jobs_account_idx
  on public.channel_jobs (channel_account_id, id desc);

drop trigger if exists channel_jobs_set_updated_at on public.channel_jobs;
create trigger channel_jobs_set_updated_at
  before update on public.channel_jobs
  for each row execute function public.set_updated_at();

create table if not exists public.channel_worker_heartbeat (
  worker_id text primary key,
  channel text not null,
  tracked int not null default 0,
  live int not null default 0,
  db_pool_max int not null default 0,
  seen_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create or replace function public.claim_channel_jobs(
  p_worker_id text,
  p_channel text,
  p_limit int default 10
)
returns setof public.channel_jobs
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select j.id
      from public.channel_jobs j
      left join public.organizations o on o.id = j.org_id
     where j.status = 'pending'
       and j.run_after <= now()
       and (p_channel = '*' or j.channel = p_channel)
       and (o.id is null or o.suspended_at is null)
     order by j.priority, j.run_after, j.id
     limit greatest(p_limit, 1)
     for update of j skip locked
  )
  update public.channel_jobs j
     set status = 'claimed',
         claimed_by = p_worker_id,
         claimed_at = now(),
         attempts = j.attempts + 1,
         updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

revoke all on function public.claim_channel_jobs(text, text, int) from public, anon, authenticated;
grant execute on function public.claim_channel_jobs(text, text, int) to service_role;

create or replace function public.reclaim_stale_channel_jobs(p_stale_seconds int default 900)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n int;
begin
  with updated as (
    update public.channel_jobs
       set status = 'pending',
           claimed_by = null,
           claimed_at = null,
           error = coalesce(error, '') || ' [stale reclaim]',
           updated_at = now()
     where status in ('claimed', 'running')
       and claimed_at is not null
       and claimed_at < now() - make_interval(secs => greatest(p_stale_seconds, 60))
    returning 1
  )
  select count(*)::int into n from updated;
  return coalesce(n, 0);
end;
$$;

revoke all on function public.reclaim_stale_channel_jobs(int) from public, anon, authenticated;
grant execute on function public.reclaim_stale_channel_jobs(int) to service_role;

alter table public.channel_jobs enable row level security;
alter table public.channel_worker_heartbeat enable row level security;

drop policy if exists channel_jobs_select_org on public.channel_jobs;
create policy channel_jobs_select_org on public.channel_jobs
  for select to authenticated
  using (
    org_id in (
      select m.org_id from public.organization_members m where m.user_id = auth.uid()
    )
  );

drop policy if exists channel_jobs_insert_org on public.channel_jobs;
create policy channel_jobs_insert_org on public.channel_jobs
  for insert to authenticated
  with check (
    org_id in (
      select m.org_id from public.organization_members m
      where m.user_id = auth.uid() and m.role in ('owner', 'admin')
    )
  );

drop policy if exists channel_worker_heartbeat_deny on public.channel_worker_heartbeat;
create policy channel_worker_heartbeat_deny on public.channel_worker_heartbeat
  for all to authenticated
  using (false)
  with check (false);

grant select, insert on public.channel_jobs to authenticated;
