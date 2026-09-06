-- WhatsApp rehberinden kisi ice aktarma tablosu ve kısıt guncellemeleri

-- 1) account_contacts: her hesaba ait senkronize edilen WhatsApp kisileri
create table if not exists public.account_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  phone_e164 text not null,
  wa_jid text not null,
  name text,
  notify text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_contacts_unique unique (account_id, phone_e164)
);

create index if not exists account_contacts_org_idx on public.account_contacts (org_id);
create index if not exists account_contacts_account_idx on public.account_contacts (account_id);
create index if not exists account_contacts_phone_idx on public.account_contacts (phone_e164);

alter table public.account_contacts enable row level security;

drop policy if exists "account_contacts_select" on public.account_contacts;
create policy "account_contacts_select" on public.account_contacts
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists "account_contacts_insert" on public.account_contacts;
create policy "account_contacts_insert" on public.account_contacts
  for insert to authenticated
  with check (public.is_org_member(org_id));

drop policy if exists "account_contacts_update" on public.account_contacts;
create policy "account_contacts_update" on public.account_contacts
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "account_contacts_delete" on public.account_contacts;
create policy "account_contacts_delete" on public.account_contacts
  for delete to authenticated
  using (public.is_org_member(org_id));

grant select, insert, update, delete on public.account_contacts to authenticated;
grant all on public.account_contacts to service_role;

-- 2) contact_lists & contacts source check kısıtlarını whatsapp'i kapsayacak sekilde genislet
alter table public.contact_lists
  drop constraint if exists contact_lists_source_check;

alter table public.contact_lists
  add constraint contact_lists_source_check
  check (source in ('manual', 'csv', 'xlsx', 'scraper', 'api', 'quick_send', 'maps', 'whatsapp'));

alter table public.contacts
  drop constraint if exists contacts_source_check;

alter table public.contacts
  add constraint contacts_source_check
  check (source in ('manual', 'csv', 'xlsx', 'scraper', 'api', 'maps', 'whatsapp'));

-- 3) jobs type check kısıtına account.sync_contacts ekle
alter table public.jobs drop constraint if exists jobs_type_check;

alter table public.jobs
  add constraint jobs_type_check check (type in (
    'account.connect',
    'account.disconnect',
    'account.logout',
    'account.request_pairing_code',
    'account.sync_contacts',
    'message.send',
    'contacts.verify',
    'contacts.check_phone',
    'contacts.scrape',
    'contacts.discover',
    'creative.render',
    'campaign.start',
    'campaign.pause',
    'campaign.resume',
    'campaign.stop',
    'campaign.refresh_targets'
  ));
