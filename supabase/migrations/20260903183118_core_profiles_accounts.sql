-- Panel kullanicisi, WhatsApp hesaplari ve hesap olay akisi.

-- ---------------------------------------------------------------------------
-- profiles: auth.users ile 1-1
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  company text,
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'pro', 'enterprise')),
  accounts_quota int not null default 1 check (accounts_quota >= 0),
  monthly_message_quota int not null default 1000 check (monthly_message_quota >= 0),
  onboarding_step text not null default 'welcome',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Panel kullanici profili. Kota alanlari simdilik sadece kayit tutuyor, odeme entegrasyonu yok.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Yeni kullanici kaydolunca profil satiri olussun.
-- SECURITY DEFINER zorunlu: auth.users trigger'i profiles'a yazacak.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- public semasindaki SECURITY DEFINER fonksiyonlar varsayilan olarak PUBLIC'e
-- EXECUTE ile aciktir. Bu bir trigger fonksiyonu, kimsenin cagirmasi gerekmiyor.
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- accounts: bagli WhatsApp hesaplari
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  label text not null,

  -- Baglanti sonrasi servis tarafindan doldurulur.
  phone_e164 text,
  wa_jid text,
  wa_lid text,

  status text not null default 'disconnected'
    check (status in (
      'disconnected', 'connecting', 'qr_pending', 'pairing_pending',
      'connected', 'logged_out', 'banned', 'error'
    )),
  status_detail text,
  last_disconnect_code int,

  qr_code text,
  qr_expires_at timestamptz,
  pairing_code text,
  pairing_expires_at timestamptz,

  connected_at timestamptz,
  last_seen_at timestamptz,

  -- Isindirma ve gunluk kota
  warmup_started_at timestamptz,
  daily_send_limit int not null default 20 check (daily_send_limit >= 0),
  sent_today int not null default 0 check (sent_today >= 0),
  sent_today_on date,

  -- Emniyet valfi: 403 / device_removed / surekli 440 gelirse servis kilitler.
  enabled boolean not null default true,
  is_locked boolean not null default false,
  lock_reason text,
  locked_at timestamptz,

  -- Baileys tarafi
  wa_version text,
  schema_version int not null default 7,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounts_label_unique unique (owner_id, label)
);

comment on table public.accounts is 'Her satir bir WhatsApp oturumu. status ve qr alanlarini yalnizca VPS servisi yazar.';
comment on column public.accounts.schema_version is 'wa.auth_state formatinin surumu. Baileys v8 auth formatini degistirdiginde toplu migrasyon icin.';

create index accounts_owner_idx on public.accounts (owner_id);
create index accounts_status_idx on public.accounts (status) where enabled;
create unique index accounts_owner_phone_idx
  on public.accounts (owner_id, phone_e164)
  where phone_e164 is not null;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- account_events: panelin canli log akisi
-- ---------------------------------------------------------------------------
create table public.account_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade,
  level text not null default 'info'
    check (level in ('debug', 'info', 'warn', 'error')),
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index account_events_account_idx on public.account_events (account_id, id desc);
create index account_events_owner_idx on public.account_events (owner_id, id desc);
