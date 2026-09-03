-- jobs: panel ile VPS servisi arasindaki tek iletisim kanali.
-- Panel satir yazar, VPS ceker. Boylece VPS'te internete acik port yok.

create table public.jobs (
  id bigint generated always as identity primary key,

  -- Sistem isleri icin owner_id bos olabilir.
  owner_id uuid references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,

  type text not null check (type in (
    'account.connect',
    'account.disconnect',
    'account.logout',
    'account.request_pairing_code',
    'message.send',
    'contacts.verify',
    'creative.render',
    'campaign.start',
    'campaign.pause',
    'campaign.resume',
    'campaign.stop'
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

comment on table public.jobs is 'Komut kuyrugu. Panel INSERT eder, servis FOR UPDATE SKIP LOCKED ile alir. Durum kolonlarini panel yazamaz.';

-- Kuyruk taramasi yalnizca bekleyen isleri gezer.
create index jobs_queue_idx
  on public.jobs (priority, run_after, id)
  where status = 'pending';
create index jobs_owner_idx on public.jobs (owner_id, id desc);
create index jobs_account_idx on public.jobs (account_id, id desc);
create index jobs_cleanup_idx
  on public.jobs (finished_at)
  where status in ('done', 'cancelled');

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();
