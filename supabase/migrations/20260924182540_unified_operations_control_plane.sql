-- Unified Operations Control Plane
-- Append-only operational events that complement (rather than replace)
-- the existing jobs, ai_media_events, message_log, and heartbeat tables.

create table if not exists public.operations_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  job_id text,
  org_id uuid references public.organizations(id) on delete cascade,
  customer_id text,
  conversation_id text,
  bot_id text,
  job_type text,
  state text,
  worker_id text,
  provider text,
  account_id text,
  attempt_id text,
  current_phase text,
  message text,
  error_code text,
  error_message text,
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.operations_events is
  'Append-only, secret-free event projection for the Mesajify operations control plane.';

create index if not exists operations_events_created_idx
  on public.operations_events (created_at desc);

create index if not exists operations_events_job_idx
  on public.operations_events (job_id, created_at asc)
  where job_id is not null;

create index if not exists operations_events_org_created_idx
  on public.operations_events (org_id, created_at desc)
  where org_id is not null;

create index if not exists operations_events_actionable_idx
  on public.operations_events (event_type, created_at desc)
  where event_type in (
    'AUTH_REQUIRED', 'CAPTCHA_REQUIRED', 'ACCOUNT_NO_QUOTA',
    'WORKER_OFFLINE', 'JOB_FAILED', 'QUEUE_BACKLOG', 'STALE_JOB'
  );

alter table public.operations_events enable row level security;

revoke all on table public.operations_events from public, anon, authenticated;
grant select on table public.operations_events to authenticated;
grant select, insert on table public.operations_events to service_role;
grant usage, select on sequence public.operations_events_id_seq to service_role;

drop policy if exists operations_events_select_authorized on public.operations_events;
create policy operations_events_select_authorized
  on public.operations_events
  for select
  to authenticated
  using (
    public.is_platform_admin()
    or (
      org_id is not null
      and org_id in (
        select m.org_id
        from public.organization_members m
        where m.user_id = (select auth.uid())
      )
    )
  );

-- Postgres Changes is intentionally limited to this compact append-only table.
-- Existing high-volume source tables keep their current publication behavior.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'operations_events'
     ) then
    alter publication supabase_realtime add table public.operations_events;
  end if;
end
$$;
