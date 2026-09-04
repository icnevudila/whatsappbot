-- Cok kiracili isletme (organization) modeli.
-- owner_id (kullanici) → org_id (kiraci) + created_by (denetim).

-- ---------------------------------------------------------------------------
-- 1) organizations + members
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'pro', 'enterprise')),
  accounts_quota int not null default 1 check (accounts_quota >= 0),
  monthly_message_quota int not null default 1000 check (monthly_message_quota >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_unique unique (slug)
);

comment on table public.organizations is
  'Kiraci birimi (isletme). Kota/plan burada; panel UI adi: Isletme.';

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index organization_members_user_idx
  on public.organization_members (user_id);

comment on table public.organization_members is
  'Isletme uyeligi. owner/admin yonetir; member is verisi okur/yazar.';

-- profiles: aktif isletme
alter table public.profiles
  add column if not exists active_org_id uuid;

-- ---------------------------------------------------------------------------
-- 2) RLS helper fonksiyonlari
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.org_id = p_org_id
       and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.org_id = p_org_id
       and m.user_id = (select auth.uid())
       and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id
    from public.organization_members m
   where m.user_id = (select auth.uid());
$$;

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.is_org_admin(uuid) from public, anon;
revoke all on function public.user_org_ids() from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.is_org_admin(uuid) to authenticated, service_role;
grant execute on function public.user_org_ids() to authenticated, service_role;

create or replace function public.slugify(p_text text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  s text;
begin
  s := lower(coalesce(p_text, ''));
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := trim(both '-' from s);
  if s = '' then
    s := 'isletme';
  end if;
  return left(s, 48);
end;
$$;

revoke all on function public.slugify(text) from public, anon;
-- slugify yalnizca definer fonksiyonlar icinde; authenticated RPC gerekmez
grant execute on function public.slugify(text) to service_role;

-- Atomik isletme olusturma (uye + active_org)
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_slug text;
  v_base text;
  v_i int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'name too short';
  end if;

  v_base := public.slugify(p_name);
  v_slug := v_base;

  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i::text;
  end loop;

  insert into public.organizations (name, slug)
  values (trim(p_name), v_slug)
  returning id into v_id;

  insert into public.organization_members (org_id, user_id, role)
  values (v_id, v_uid, 'owner');

  update public.profiles
     set active_org_id = v_id
   where id = v_uid;

  return v_id;
end;
$$;

revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated, service_role;

-- E-posta ile uye ekleme (yalnizca admin+)
create or replace function public.add_organization_member(
  p_org_id uuid,
  p_email text,
  p_role text default 'member'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_role text := lower(coalesce(p_role, 'member'));
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'not org admin';
  end if;

  if v_role not in ('admin', 'member') then
    raise exception 'invalid role';
  end if;

  select p.id into v_uid
    from public.profiles p
   where lower(p.email) = lower(trim(p_email))
   limit 1;

  if v_uid is null then
    raise exception 'user not found';
  end if;

  if exists (
    select 1 from public.organization_members m
     where m.org_id = p_org_id and m.user_id = v_uid and m.role = 'owner'
  ) then
    raise exception 'cannot change owner via this function';
  end if;

  insert into public.organization_members (org_id, user_id, role)
  values (p_org_id, v_uid, v_role)
  on conflict (org_id, user_id) do update
    set role = excluded.role;
end;
$$;

revoke all on function public.add_organization_member(uuid, text, text) from public, anon;
grant execute on function public.add_organization_member(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Tenant tablolarina org_id ekle (nullable → backfill → not null)
-- ---------------------------------------------------------------------------
alter table public.accounts add column if not exists org_id uuid;
alter table public.account_events add column if not exists org_id uuid;
alter table public.contact_lists add column if not exists org_id uuid;
alter table public.contacts add column if not exists org_id uuid;
alter table public.contact_list_members add column if not exists org_id uuid;
alter table public.blacklist add column if not exists org_id uuid;
alter table public.brand_kits add column if not exists org_id uuid;
alter table public.creatives add column if not exists org_id uuid;
alter table public.campaigns add column if not exists org_id uuid;
alter table public.campaign_accounts add column if not exists org_id uuid;
alter table public.campaign_targets add column if not exists org_id uuid;
alter table public.message_log add column if not exists org_id uuid;
alter table public.jobs add column if not exists org_id uuid;

-- ---------------------------------------------------------------------------
-- 4) Backfill: her profil → bir isletme
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_org uuid;
  v_slug text;
  v_base text;
  v_name text;
  v_i int;
begin
  for r in
    select p.id, p.email, p.full_name, p.company, p.plan,
           p.accounts_quota, p.monthly_message_quota
      from public.profiles p
  loop
    v_name := coalesce(
      nullif(trim(r.company), ''),
      nullif(trim(r.full_name), ''),
      split_part(coalesce(r.email, 'isletme'), '@', 1),
      'Isletme'
    );
    v_base := public.slugify(v_name || '-' || left(replace(r.id::text, '-', ''), 8));
    v_slug := v_base;
    v_i := 0;
    while exists (select 1 from public.organizations o where o.slug = v_slug) loop
      v_i := v_i + 1;
      v_slug := v_base || '-' || v_i::text;
    end loop;

    insert into public.organizations (
      name, slug, plan, accounts_quota, monthly_message_quota
    ) values (
      v_name,
      v_slug,
      coalesce(r.plan, 'free'),
      coalesce(r.accounts_quota, 1),
      coalesce(r.monthly_message_quota, 1000)
    )
    returning id into v_org;

    insert into public.organization_members (org_id, user_id, role)
    values (v_org, r.id, 'owner')
    on conflict do nothing;

    update public.profiles set active_org_id = v_org where id = r.id;

    update public.accounts set org_id = v_org where owner_id = r.id and org_id is null;
    update public.account_events set org_id = v_org where owner_id = r.id and org_id is null;
    update public.contact_lists set org_id = v_org where owner_id = r.id and org_id is null;
    update public.contacts set org_id = v_org where owner_id = r.id and org_id is null;
    update public.contact_list_members set org_id = v_org where owner_id = r.id and org_id is null;
    update public.blacklist set org_id = v_org where owner_id = r.id and org_id is null;
    update public.brand_kits set org_id = v_org where owner_id = r.id and org_id is null;
    update public.creatives set org_id = v_org where owner_id = r.id and org_id is null;
    update public.campaigns set org_id = v_org where owner_id = r.id and org_id is null;
    update public.campaign_accounts set org_id = v_org where owner_id = r.id and org_id is null;
    update public.campaign_targets set org_id = v_org where owner_id = r.id and org_id is null;
    update public.message_log set org_id = v_org where owner_id = r.id and org_id is null;
    update public.jobs set org_id = v_org where owner_id = r.id and org_id is null;
  end loop;
end;
$$;

-- Orphan / sistem isleri: org yoksa null kalsin (yalnizca jobs)
-- Diger tablolarda org zorunlu
do $$
begin
  if exists (select 1 from public.accounts where org_id is null) then
    raise exception 'accounts backfill incomplete';
  end if;
  if exists (select 1 from public.contacts where org_id is null) then
    raise exception 'contacts backfill incomplete';
  end if;
  if exists (select 1 from public.campaigns where org_id is null) then
    raise exception 'campaigns backfill incomplete';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) owner_id → created_by rename
-- ---------------------------------------------------------------------------
alter table public.accounts rename column owner_id to created_by;
alter table public.account_events rename column owner_id to created_by;
alter table public.contact_lists rename column owner_id to created_by;
alter table public.contacts rename column owner_id to created_by;
alter table public.contact_list_members rename column owner_id to created_by;
alter table public.blacklist rename column owner_id to created_by;
alter table public.brand_kits rename column owner_id to created_by;
alter table public.creatives rename column owner_id to created_by;
alter table public.campaigns rename column owner_id to created_by;
alter table public.campaign_accounts rename column owner_id to created_by;
alter table public.campaign_targets rename column owner_id to created_by;
alter table public.message_log rename column owner_id to created_by;
alter table public.jobs rename column owner_id to created_by;

-- ---------------------------------------------------------------------------
-- 6) FK + NOT NULL org_id + unique/index yenileme
-- ---------------------------------------------------------------------------
alter table public.accounts
  alter column org_id set not null,
  add constraint accounts_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.account_events
  alter column org_id set not null,
  add constraint account_events_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.contact_lists
  alter column org_id set not null,
  add constraint contact_lists_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.contacts
  alter column org_id set not null,
  add constraint contacts_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.contact_list_members
  alter column org_id set not null,
  add constraint contact_list_members_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.blacklist
  alter column org_id set not null,
  add constraint blacklist_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.brand_kits
  alter column org_id set not null,
  add constraint brand_kits_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.creatives
  alter column org_id set not null,
  add constraint creatives_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.campaigns
  alter column org_id set not null,
  add constraint campaigns_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.campaign_accounts
  alter column org_id set not null,
  add constraint campaign_accounts_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.campaign_targets
  alter column org_id set not null,
  add constraint campaign_targets_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.message_log
  alter column org_id set not null,
  add constraint message_log_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

-- jobs.org_id nullable (sistem isleri)
alter table public.jobs
  add constraint jobs_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.profiles
  add constraint profiles_active_org_id_fkey
    foreign key (active_org_id) references public.organizations (id) on delete set null;

-- Unique: eski owner bazli → org bazli
alter table public.accounts drop constraint if exists accounts_label_unique;
alter table public.accounts
  add constraint accounts_label_unique unique (org_id, label);

drop index if exists public.accounts_owner_phone_idx;
create unique index accounts_org_phone_idx
  on public.accounts (org_id, phone_e164)
  where phone_e164 is not null;

alter table public.contact_lists drop constraint if exists contact_lists_name_unique;
alter table public.contact_lists
  add constraint contact_lists_name_unique unique (org_id, name);

alter table public.contacts drop constraint if exists contacts_phone_unique;
alter table public.contacts
  add constraint contacts_phone_unique unique (org_id, phone_e164);

alter table public.blacklist drop constraint if exists blacklist_phone_unique;
alter table public.blacklist
  add constraint blacklist_phone_unique unique (org_id, phone_e164);

alter table public.brand_kits drop constraint if exists brand_kits_name_unique;
alter table public.brand_kits
  add constraint brand_kits_name_unique unique (org_id, name);

-- Index yenile
drop index if exists public.accounts_owner_idx;
create index accounts_org_idx on public.accounts (org_id);

drop index if exists public.account_events_owner_idx;
create index account_events_org_idx on public.account_events (org_id, id desc);

drop index if exists public.contact_lists_owner_idx;
create index contact_lists_org_idx on public.contact_lists (org_id);

drop index if exists public.contacts_owner_idx;
create index contacts_org_idx on public.contacts (org_id);

drop index if exists public.contacts_wa_status_idx;
create index contacts_wa_status_idx on public.contacts (org_id, wa_status);

drop index if exists public.contact_list_members_owner_idx;
create index contact_list_members_org_idx on public.contact_list_members (org_id);

drop index if exists public.blacklist_owner_idx;
create index blacklist_org_idx on public.blacklist (org_id);

drop index if exists public.brand_kits_owner_idx;
create index brand_kits_org_idx on public.brand_kits (org_id);

drop index if exists public.brand_kits_one_default_idx;
create unique index brand_kits_one_default_idx
  on public.brand_kits (org_id)
  where is_default;

drop index if exists public.creatives_owner_idx;
create index creatives_org_idx on public.creatives (org_id, created_at desc);

drop index if exists public.campaigns_owner_idx;
create index campaigns_org_idx on public.campaigns (org_id, created_at desc);

drop index if exists public.campaign_accounts_owner_idx;
create index campaign_accounts_org_idx on public.campaign_accounts (org_id);

drop index if exists public.campaign_targets_owner_idx;
create index campaign_targets_org_idx on public.campaign_targets (org_id, id desc);

drop index if exists public.message_log_owner_idx;
create index message_log_org_idx on public.message_log (org_id, id desc);

drop index if exists public.message_log_inbound_idx;
create index message_log_inbound_idx
  on public.message_log (org_id, id desc)
  where direction = 'in';

drop index if exists public.message_log_phone_idx;
create index message_log_phone_idx
  on public.message_log (org_id, phone_e164, id)
  where phone_e164 is not null;

drop index if exists public.jobs_owner_idx;
create index jobs_org_idx on public.jobs (org_id, id desc);
create index jobs_created_by_idx on public.jobs (created_by, id desc);

-- ---------------------------------------------------------------------------
-- 7) Junction org tutarliligi
-- ---------------------------------------------------------------------------
create or replace function public.enforce_campaign_account_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.campaigns c
     where c.id = new.campaign_id and c.org_id = new.org_id
  ) then
    raise exception 'campaign_accounts: campaign org mismatch';
  end if;

  if not exists (
    select 1 from public.accounts a
     where a.id = new.account_id and a.org_id = new.org_id
  ) then
    raise exception 'campaign_accounts: account org mismatch';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_list_member_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.contact_lists l
     where l.id = new.list_id and l.org_id = new.org_id
  ) then
    raise exception 'contact_list_members: list org mismatch';
  end if;

  if not exists (
    select 1 from public.contacts c
     where c.id = new.contact_id and c.org_id = new.org_id
  ) then
    raise exception 'contact_list_members: contact org mismatch';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) handle_new_user: profil + kisisel org
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_name text;
  v_slug text;
  v_base text;
  v_i int := 0;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'company', ''),
    split_part(coalesce(new.email, 'isletme'), '@', 1),
    'Isletme'
  );
  v_base := public.slugify(v_name || '-' || left(replace(new.id::text, '-', ''), 8));
  v_slug := v_base;
  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i::text;
  end loop;

  insert into public.organizations (name, slug)
  values (v_name, v_slug)
  returning id into v_org;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org, new.id, 'owner')
  on conflict do nothing;

  update public.profiles
     set active_org_id = v_org
   where id = new.id
     and active_org_id is null;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9) RLS: eski politikalar → org uyelik
-- ---------------------------------------------------------------------------
drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_own" on public.accounts;

drop policy if exists "account_events_select_own" on public.account_events;
drop policy if exists "campaign_targets_select_own" on public.campaign_targets;
drop policy if exists "message_log_select_own" on public.message_log;

drop policy if exists "contact_lists_select_own" on public.contact_lists;
drop policy if exists "contact_lists_insert_own" on public.contact_lists;
drop policy if exists "contact_lists_update_own" on public.contact_lists;
drop policy if exists "contact_lists_delete_own" on public.contact_lists;

drop policy if exists "contacts_select_own" on public.contacts;
drop policy if exists "contacts_insert_own" on public.contacts;
drop policy if exists "contacts_update_own" on public.contacts;
drop policy if exists "contacts_delete_own" on public.contacts;

drop policy if exists "contact_list_members_select_own" on public.contact_list_members;
drop policy if exists "contact_list_members_insert_own" on public.contact_list_members;
drop policy if exists "contact_list_members_update_own" on public.contact_list_members;
drop policy if exists "contact_list_members_delete_own" on public.contact_list_members;

drop policy if exists "blacklist_select_own" on public.blacklist;
drop policy if exists "blacklist_insert_own" on public.blacklist;
drop policy if exists "blacklist_update_own" on public.blacklist;
drop policy if exists "blacklist_delete_own" on public.blacklist;

drop policy if exists "brand_kits_select_own" on public.brand_kits;
drop policy if exists "brand_kits_insert_own" on public.brand_kits;
drop policy if exists "brand_kits_update_own" on public.brand_kits;
drop policy if exists "brand_kits_delete_own" on public.brand_kits;

drop policy if exists "creatives_select_own" on public.creatives;
drop policy if exists "creatives_insert_own" on public.creatives;
drop policy if exists "creatives_delete_own" on public.creatives;

drop policy if exists "campaigns_select_own" on public.campaigns;
drop policy if exists "campaigns_insert_own" on public.campaigns;
drop policy if exists "campaigns_update_own" on public.campaigns;
drop policy if exists "campaigns_delete_own" on public.campaigns;

drop policy if exists "campaign_accounts_select_own" on public.campaign_accounts;
drop policy if exists "campaign_accounts_insert_own" on public.campaign_accounts;
drop policy if exists "campaign_accounts_delete_own" on public.campaign_accounts;

drop policy if exists "jobs_select_own" on public.jobs;
drop policy if exists "jobs_insert_own" on public.jobs;

-- profiles: active_org_id guncellenebilir
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "organizations_select_member" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy "organizations_update_admin" on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- Insert dogrudan kapali; create_organization() security definer kullan
-- (RLS insert yok → authenticated INSERT grant olsa bile satir yazilamaz;
--  fonksiyon security definer ile yazar)

create policy "organization_members_select" on public.organization_members
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "organization_members_delete_admin" on public.organization_members
  for delete to authenticated
  using (
    public.is_org_admin(org_id)
    and role <> 'owner'
  );

-- Tenant tablolari: uye okur/yazar
create policy "accounts_select_member" on public.accounts
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "accounts_insert_member" on public.accounts
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "accounts_update_member" on public.accounts
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "accounts_delete_member" on public.accounts
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "account_events_select_member" on public.account_events
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "campaign_targets_select_member" on public.campaign_targets
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "message_log_select_member" on public.message_log
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "contact_lists_select_member" on public.contact_lists
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "contact_lists_insert_member" on public.contact_lists
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "contact_lists_update_member" on public.contact_lists
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "contact_lists_delete_member" on public.contact_lists
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "contacts_select_member" on public.contacts
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "contacts_insert_member" on public.contacts
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "contacts_update_member" on public.contacts
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "contacts_delete_member" on public.contacts
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "contact_list_members_select_member" on public.contact_list_members
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "contact_list_members_insert_member" on public.contact_list_members
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "contact_list_members_update_member" on public.contact_list_members
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "contact_list_members_delete_member" on public.contact_list_members
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "blacklist_select_member" on public.blacklist
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "blacklist_insert_member" on public.blacklist
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "blacklist_update_member" on public.blacklist
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "blacklist_delete_member" on public.blacklist
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "brand_kits_select_member" on public.brand_kits
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "brand_kits_insert_member" on public.brand_kits
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "brand_kits_update_member" on public.brand_kits
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "brand_kits_delete_member" on public.brand_kits
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "creatives_select_member" on public.creatives
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "creatives_insert_member" on public.creatives
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "creatives_delete_member" on public.creatives
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "campaigns_select_member" on public.campaigns
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "campaigns_insert_member" on public.campaigns
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "campaigns_update_member" on public.campaigns
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "campaigns_delete_member" on public.campaigns
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "campaign_accounts_select_member" on public.campaign_accounts
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "campaign_accounts_insert_member" on public.campaign_accounts
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "campaign_accounts_delete_member" on public.campaign_accounts
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "jobs_select_member" on public.jobs
  for select to authenticated
  using (
    org_id is not null
    and public.is_org_member(org_id)
  );
create policy "jobs_insert_member" on public.jobs
  for insert to authenticated
  with check (
    org_id is not null
    and public.is_org_member(org_id)
    and created_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 10) Grants
-- ---------------------------------------------------------------------------
grant select on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;

grant select, delete on public.organization_members to authenticated;

grant update (full_name, company, onboarding_step, onboarded_at, active_org_id)
  on public.profiles to authenticated;

-- contacts update: created_by degil org_id/phone...
revoke update on public.contacts from authenticated;
grant update (phone_e164, name, extra, source) on public.contacts to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant execute on all functions in schema public to service_role;
