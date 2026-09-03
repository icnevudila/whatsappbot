-- Kisi listeleri, kisiler, liste uyelikleri ve karaliste.

create table public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  source text not null default 'manual'
    check (source in ('manual', 'csv', 'xlsx', 'scraper', 'api')),
  contact_count int not null default 0 check (contact_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_lists_name_unique unique (owner_id, name)
);

create index contact_lists_owner_idx on public.contact_lists (owner_id);

create trigger contact_lists_set_updated_at
  before update on public.contact_lists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts: numaralar her zaman E.164 olarak saklanir
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  name text,
  extra jsonb not null default '{}'::jsonb,
  source text not null default 'manual'
    check (source in ('manual', 'csv', 'xlsx', 'scraper', 'api')),

  -- onWhatsApp() sonucu. Kampanya yalnizca 'valid' hedeflere gider:
  -- kayitli olmayan numaraya gonderim denemesi 463 reach-out time-lock tetikliyor.
  wa_status text not null default 'unknown'
    check (wa_status in ('unknown', 'valid', 'invalid')),
  wa_jid text,
  wa_checked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_phone_unique unique (owner_id, phone_e164)
);

comment on column public.contacts.wa_status is 'onWhatsApp() dogrulama onbellegi. Gonderim yolunda zorunlu kapi.';

create index contacts_owner_idx on public.contacts (owner_id);
create index contacts_wa_status_idx on public.contacts (owner_id, wa_status);
create index contacts_name_trgm_idx
  on public.contacts using gin (name extensions.gin_trgm_ops);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contact_list_members
-- ---------------------------------------------------------------------------
create table public.contact_list_members (
  list_id uuid not null references public.contact_lists (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, contact_id)
);

create index contact_list_members_contact_idx on public.contact_list_members (contact_id);
create index contact_list_members_owner_idx on public.contact_list_members (owner_id);

-- ---------------------------------------------------------------------------
-- blacklist: bir daha asla mesaj gitmeyecek numaralar
-- ---------------------------------------------------------------------------
create table public.blacklist (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  phone_e164 text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint blacklist_phone_unique unique (owner_id, phone_e164)
);

create index blacklist_owner_idx on public.blacklist (owner_id);
