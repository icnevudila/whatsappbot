-- Browser Worker Distributed Account Lease Table & Atomic Functions
-- Enforces: exactly one live lease per (provider, account_id) across multiple hosts/processes.

create table if not exists public.browser_account_leases (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  account_id text not null,
  worker_id text not null,
  job_id text not null,
  lease_token text not null,
  acquired_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  expires_at timestamptz not null,
  released_at timestamptz,
  constraint browser_account_leases_provider_account_unique unique (provider, account_id)
);

create index if not exists idx_browser_account_leases_expires on public.browser_account_leases(expires_at);
create index if not exists idx_browser_account_leases_lookup on public.browser_account_leases(provider, account_id, lease_token);

-- Atomic acquire / reclaim function
create or replace function public.acquire_browser_account_lease(
  p_provider text,
  p_account_id text,
  p_worker_id text,
  p_job_id text,
  p_lease_token text,
  p_ttl_seconds int default 60
)
returns table (
  acquired boolean,
  current_lease_token text,
  expires_at timestamptz,
  message text
) language plpgsql as $$
declare
  v_now timestamptz := now();
  v_expires timestamptz := v_now + (p_ttl_seconds || ' seconds')::interval;
  v_row record;
begin
  -- Try to insert or take over expired/released lease atomically
  insert into public.browser_account_leases as b (
    provider, account_id, worker_id, job_id, lease_token, acquired_at, heartbeat_at, expires_at, released_at
  )
  values (
    p_provider, p_account_id, p_worker_id, p_job_id, p_lease_token, v_now, v_now, v_expires, null
  )
  on conflict (provider, account_id) do update
    set worker_id = excluded.worker_id,
        job_id = excluded.job_id,
        lease_token = excluded.lease_token,
        acquired_at = excluded.acquired_at,
        heartbeat_at = excluded.heartbeat_at,
        expires_at = excluded.expires_at,
        released_at = null
    where b.expires_at < v_now or b.released_at is not null
  returning b.* into v_row;

  if found then
    return query select true, v_row.lease_token, v_row.expires_at, 'LEASE_ACQUIRED'::text;
  else
    select * from public.browser_account_leases where provider = p_provider and account_id = p_account_id into v_row;
    return query select false, v_row.lease_token, v_row.expires_at, 'ACCOUNT_BUSY'::text;
  end if;
end;
$$;

-- Heartbeat extension function
create or replace function public.heartbeat_browser_account_lease(
  p_provider text,
  p_account_id text,
  p_lease_token text,
  p_ttl_seconds int default 60
)
returns boolean language plpgsql as $$
declare
  v_now timestamptz := now();
  v_expires timestamptz := v_now + (p_ttl_seconds || ' seconds')::interval;
  v_updated int;
begin
  update public.browser_account_leases
  set heartbeat_at = v_now,
      expires_at = v_expires
  where provider = p_provider
    and account_id = p_account_id
    and lease_token = p_lease_token
    and released_at is null;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- Release function
create or replace function public.release_browser_account_lease(
  p_provider text,
  p_account_id text,
  p_lease_token text
)
returns boolean language plpgsql as $$
declare
  v_updated int;
begin
  update public.browser_account_leases
  set released_at = now(),
      expires_at = now()
  where provider = p_provider
    and account_id = p_account_id
    and lease_token = p_lease_token;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;
