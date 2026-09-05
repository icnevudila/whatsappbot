-- Autoscaler kontrol duzlemi: worker heartbeat + desired replica.

create table if not exists wa.worker_heartbeat (
  worker_id text primary key,
  max_sessions int not null default 50 check (max_sessions > 0),
  tracked int not null default 0 check (tracked >= 0),
  live int not null default 0 check (live >= 0),
  db_pool_max int not null default 2 check (db_pool_max > 0),
  seen_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

comment on table wa.worker_heartbeat is
  'Her wa-service worker periyodik upsert; scaler alive sayisi icin.';

create table if not exists wa.scaler_state (
  id int primary key default 1 check (id = 1),
  desired_workers int not null default 1 check (desired_workers >= 0),
  demand int not null default 0 check (demand >= 0),
  alive_workers int not null default 0 check (alive_workers >= 0),
  capacity_per_worker int not null default 50 check (capacity_per_worker > 0),
  reason text,
  updated_at timestamptz not null default now()
);

comment on table wa.scaler_state is
  'Tek satir: hedef worker sayisi. Actuator (docker/webhook) bunu okur.';

insert into wa.scaler_state (id, desired_workers, demand, alive_workers, reason)
values (1, 1, 0, 0, 'init')
on conflict (id) do nothing;

alter table wa.worker_heartbeat enable row level security;
alter table wa.scaler_state enable row level security;

revoke all on table wa.worker_heartbeat from public, anon, authenticated;
revoke all on table wa.scaler_state from public, anon, authenticated;
grant all on table wa.worker_heartbeat to service_role;
grant all on table wa.scaler_state to service_role;
