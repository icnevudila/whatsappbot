-- Coklu kanal hesaplari ve mesaj olaylari (Palmate-benzeri entegrasyonlar).

create table if not exists public.channel_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  channel text not null,
  label text not null default '',
  external_account_id text,
  status text not null default 'disconnected'
    check (status in (
      'disconnected', 'connecting', 'connected', 'error', 'revoked'
    )),
  status_detail text,
  credentials jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, channel, external_account_id)
);

comment on table public.channel_accounts is 'WhatsApp disi kanal/ecom baglantilari (telegram, meta, shopify, ...).';

create index if not exists channel_accounts_org_channel_idx
  on public.channel_accounts (org_id, channel);

create trigger channel_accounts_set_updated_at
  before update on public.channel_accounts
  for each row execute function public.set_updated_at();

create table if not exists public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  channel_account_id uuid not null references public.channel_accounts (id) on delete cascade,
  channel text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  external_thread_id text not null,
  external_message_id text,
  sender_id text,
  text text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists channel_messages_external_uidx
  on public.channel_messages (channel_account_id, external_message_id)
  where external_message_id is not null;

create index if not exists channel_messages_org_occurred_idx
  on public.channel_messages (org_id, occurred_at desc);

create index if not exists channel_messages_thread_idx
  on public.channel_messages (channel_account_id, external_thread_id, occurred_at desc);

create table if not exists public.channel_webhook_events (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  delivery_id text,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists channel_webhook_events_channel_created_idx
  on public.channel_webhook_events (channel, created_at desc);

alter table public.channel_accounts enable row level security;
alter table public.channel_messages enable row level security;
alter table public.channel_webhook_events enable row level security;

-- Org uyeleri kendi org kayitlarini gorur.
create policy channel_accounts_select_org on public.channel_accounts
  for select to authenticated
  using (
    org_id in (
      select m.org_id from public.organization_members m where m.user_id = auth.uid()
    )
  );

create policy channel_accounts_write_org on public.channel_accounts
  for all to authenticated
  using (
    org_id in (
      select m.org_id from public.organization_members m
      where m.user_id = auth.uid() and m.role in ('owner', 'admin')
    )
  )
  with check (
    org_id in (
      select m.org_id from public.organization_members m
      where m.user_id = auth.uid() and m.role in ('owner', 'admin')
    )
  );

create policy channel_messages_select_org on public.channel_messages
  for select to authenticated
  using (
    org_id in (
      select m.org_id from public.organization_members m where m.user_id = auth.uid()
    )
  );

create policy channel_messages_insert_org on public.channel_messages
  for insert to authenticated
  with check (
    org_id in (
      select m.org_id from public.organization_members m where m.user_id = auth.uid()
    )
  );

-- Webhook ham olaylari sadece service role / platform admin.
create policy channel_webhook_events_deny_authenticated on public.channel_webhook_events
  for all to authenticated
  using (false)
  with check (false);

grant select, insert, update, delete on public.channel_accounts to authenticated;
grant select, insert on public.channel_messages to authenticated;
-- channel_webhook_events: authenticated'a grant yok (service role).
