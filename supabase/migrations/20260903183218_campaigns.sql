-- Kampanyalar, gonderen hesap eslestirmeleri, hedefler ve mesaj kaydi.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,

  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'running', 'paused', 'completed', 'stopped', 'failed')),

  message_type text not null default 'text'
    check (message_type in ('text', 'image', 'video', 'document')),
  body text,
  creative_id uuid references public.creatives (id) on delete set null,
  media_url text,
  media_mime text,

  -- Hedefler campaign_targets'a materyalize edilir; bu alan yalnizca kayit.
  source_list_ids uuid[] not null default '{}',

  -- Hiz ve kota. Varsayilanlar bilincli olarak yavas.
  min_delay_seconds int not null default 15 check (min_delay_seconds >= 3),
  max_delay_seconds int not null default 45 check (max_delay_seconds >= 3),
  daily_cap_per_account int not null default 50 check (daily_cap_per_account > 0),

  scheduled_at timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  stop_reason text,

  total_targets int not null default 0 check (total_targets >= 0),
  sent_count int not null default 0 check (sent_count >= 0),
  failed_count int not null default 0 check (failed_count >= 0),
  skipped_count int not null default 0 check (skipped_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaigns_delay_order check (max_delay_seconds >= min_delay_seconds)
);

comment on table public.campaigns is 'status ve sayaclari yalnizca servis yazar. Panel kampanyayi jobs tablosuna komut yazarak baslatir.';

create index campaigns_owner_idx on public.campaigns (owner_id, created_at desc);
create index campaigns_active_idx on public.campaigns (status) where status in ('scheduled', 'running');

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_accounts: kampanyanin hangi hesaplardan gonderecegi
-- ---------------------------------------------------------------------------
create table public.campaign_accounts (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  sent_count int not null default 0 check (sent_count >= 0),
  primary key (campaign_id, account_id)
);

create index campaign_accounts_account_idx on public.campaign_accounts (account_id);
create index campaign_accounts_owner_idx on public.campaign_accounts (owner_id);

-- ---------------------------------------------------------------------------
-- campaign_targets: hedef basina durum
-- ---------------------------------------------------------------------------
create table public.campaign_targets (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  phone_e164 text not null,

  -- Gonderimi yapan hesap; rotasyon isci tarafinda.
  account_id uuid references public.accounts (id) on delete set null,

  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  attempts int not null default 0 check (attempts >= 0),
  personalized_body text,
  wa_message_id text,
  error text,

  scheduled_for timestamptz,
  sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_targets_unique unique (campaign_id, phone_e164)
);

create index campaign_targets_campaign_status_idx on public.campaign_targets (campaign_id, status);
create index campaign_targets_claim_idx
  on public.campaign_targets (campaign_id, scheduled_for, id)
  where status = 'queued';
create index campaign_targets_owner_idx on public.campaign_targets (owner_id, id desc);

create trigger campaign_targets_set_updated_at
  before update on public.campaign_targets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- message_log: giden ve gelen mesajlarin panel gorunumu
-- ---------------------------------------------------------------------------
create table public.message_log (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  direction text not null default 'out' check (direction in ('out', 'in')),
  remote_jid text,
  phone_e164 text,
  message_type text not null default 'text',
  body text,
  media_url text,
  wa_message_id text,
  status text not null default 'sent'
    check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index message_log_owner_idx on public.message_log (owner_id, id desc);
create index message_log_account_idx on public.message_log (account_id, id desc);
create index message_log_campaign_idx on public.message_log (campaign_id, id desc);
