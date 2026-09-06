-- SaaS satışa hazırlık Faz 1: suspend, kota kapısı, storage org, webhook_secret,
-- self-serve org limiti, davet tablosu.

-- ---------------------------------------------------------------------------
-- 1) Org suspend kill-switch
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists suspended_at timestamptz,
  add column if not exists suspend_reason text;

comment on column public.organizations.suspended_at is
  'Doluysa gönderim/job claim reddedilir (admin kill-switch).';

create or replace function public.admin_set_org_suspended(
  p_org_id uuid,
  p_suspend boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.organizations%rowtype;
begin
  if coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, false) is not true then
    raise exception 'not platform admin';
  end if;

  update public.organizations o
     set suspended_at = case when p_suspend then coalesce(o.suspended_at, now()) else null end,
         suspend_reason = case when p_suspend then nullif(trim(p_reason), '') else null end,
         updated_at = now()
   where o.id = p_org_id
   returning * into v_row;

  if not found then
    raise exception 'organization not found';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'suspended_at', v_row.suspended_at,
    'suspend_reason', v_row.suspend_reason
  );
end;
$$;

revoke all on function public.admin_set_org_suspended(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_set_org_suspended(uuid, boolean, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Gönderim kapısı: suspend + aylık kota (atomic FOR UPDATE)
-- ---------------------------------------------------------------------------
create or replace function public.org_send_gate(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota int;
  v_suspended timestamptz;
  v_used int;
begin
  if p_org_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_org');
  end if;

  select o.monthly_message_quota, o.suspended_at
    into v_quota, v_suspended
    from public.organizations o
   where o.id = p_org_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'org_not_found');
  end if;

  if v_suspended is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'suspended',
      'quota', v_quota,
      'used', 0
    );
  end if;

  select count(*)::int into v_used
    from public.message_log
   where org_id = p_org_id
     and direction = 'out'
     and status in ('sent', 'delivered', 'read')
     and created_at >= date_trunc('month', timezone('utc', now()));

  if v_quota > 0 and v_used >= v_quota then
    return jsonb_build_object(
      'ok', false,
      'reason', 'monthly_quota',
      'quota', v_quota,
      'used', v_used
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'quota', v_quota,
    'used', v_used
  );
end;
$$;

revoke all on function public.org_send_gate(uuid) from public, anon, authenticated;
grant execute on function public.org_send_gate(uuid) to service_role;

-- Panel / API (authenticated) da kontrol edebilsin — yalnız kendi org'u.
create or replace function public.org_send_gate_member(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not org member';
  end if;
  return public.org_send_gate(p_org_id);
end;
$$;

revoke all on function public.org_send_gate_member(uuid) from public, anon;
grant execute on function public.org_send_gate_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) webhook_secret: authenticated SELECT yok; set RPC
-- ---------------------------------------------------------------------------
revoke select (webhook_secret) on table public.organizations from authenticated;

create or replace function public.set_organization_webhook(
  p_org_id uuid,
  p_webhook_url text,
  p_webhook_secret text default null,
  p_clear_secret boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'not org admin';
  end if;

  update public.organizations o
     set webhook_url = nullif(trim(p_webhook_url), ''),
         webhook_secret = case
           when p_clear_secret then null
           when p_webhook_secret is not null and length(trim(p_webhook_secret)) > 0
             then trim(p_webhook_secret)
           else o.webhook_secret
         end,
         updated_at = now()
   where o.id = p_org_id;
end;
$$;

revoke all on function public.set_organization_webhook(uuid, text, text, boolean) from public, anon;
grant execute on function public.set_organization_webhook(uuid, text, text, boolean) to authenticated, service_role;

-- Member UPDATE grant'tan secret kolonunu çıkar (yalnızca RPC yazar)
revoke update (webhook_secret) on table public.organizations from authenticated;

-- ---------------------------------------------------------------------------
-- 4) Self-serve create_organization + abuse limiti (max 3 owner org)
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_slug text;
  v_base text;
  v_i int := 0;
  v_owned int;
  v_max_owned constant int := 3;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'name too short';
  end if;

  select count(*)::int into v_owned
    from public.organization_members m
   where m.user_id = v_uid and m.role = 'owner';

  if v_owned >= v_max_owned then
    raise exception 'org limit reached (max %)', v_max_owned;
  end if;

  v_base := public.slugify(p_name);
  v_slug := v_base;

  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i::text;
  end loop;

  insert into public.organizations (
    name, slug, plan, accounts_quota, monthly_message_quota
  )
  values (
    trim(p_name),
    v_slug,
    'free',
    1,
    1000
  )
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

comment on function public.create_organization(text) is
  'Self-serve: free kota (1 hat / 1000 msg). Kullanıcı en fazla 3 sahibi olduğu org açabilir.';

-- ---------------------------------------------------------------------------
-- 5) Claim: askıdaki org işlerini alma
-- ---------------------------------------------------------------------------
create or replace function wa.claim_jobs(
  p_worker_id text,
  p_limit int default 10
)
returns setof public.jobs
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select j.id
      from public.jobs j
      left join wa.session_lease sl on sl.account_id = j.account_id
      left join public.organizations o on o.id = j.org_id
     where j.status = 'pending'
       and j.run_after <= now()
       and (o.id is null or o.suspended_at is null)
       and (
         j.account_id is null
         or (
           sl.holder_id = p_worker_id
           and sl.expires_at > now()
         )
         or (
           (sl.account_id is null or sl.expires_at <= now())
           and j.type in (
             'account.connect',
             'account.disconnect',
             'account.logout',
             'account.request_pairing_code'
           )
         )
       )
     order by j.priority, j.run_after, j.id
     limit greatest(p_limit, 1)
     for update of j skip locked
  )
  update public.jobs j
     set status = 'claimed',
         claimed_by = p_worker_id,
         claimed_at = now(),
         attempts = j.attempts + 1,
         updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

revoke all on function wa.claim_jobs(text, int) from public, anon, authenticated;
grant execute on function wa.claim_jobs(text, int) to service_role;

-- ---------------------------------------------------------------------------
-- 6) Storage: org_id kökü (+ legacy auth.uid uyumu)
-- ---------------------------------------------------------------------------
update storage.buckets
   set allowed_mime_types = array[
     'image/png', 'image/jpeg', 'image/webp',
     'video/mp4', 'video/quicktime', 'application/pdf'
   ]
 where id = 'creatives';

drop policy if exists "brand_assets_select_own" on storage.objects;
drop policy if exists "brand_assets_insert_own" on storage.objects;
drop policy if exists "brand_assets_update_own" on storage.objects;
drop policy if exists "brand_assets_delete_own" on storage.objects;
drop policy if exists "creatives_select_own" on storage.objects;
drop policy if exists "creatives_insert_own" on storage.objects;
drop policy if exists "creatives_delete_own" on storage.objects;
drop policy if exists "imports_select_own" on storage.objects;
drop policy if exists "imports_insert_own" on storage.objects;
drop policy if exists "imports_update_own" on storage.objects;
drop policy if exists "imports_delete_own" on storage.objects;

create or replace function public.storage_path_allowed(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when (storage.foldername(p_name))[1] = (select auth.uid())::text then true
      when (storage.foldername(p_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_org_member((storage.foldername(p_name))[1]::uuid)
      else false
    end;
$$;

revoke all on function public.storage_path_allowed(text) from public, anon;
grant execute on function public.storage_path_allowed(text) to authenticated, service_role;

create policy "brand_assets_select_member" on storage.objects
  for select to authenticated
  using (bucket_id = 'brand-assets' and public.storage_path_allowed(name));

create policy "brand_assets_insert_member" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.storage_path_allowed(name));

create policy "brand_assets_update_member" on storage.objects
  for update to authenticated
  using (bucket_id = 'brand-assets' and public.storage_path_allowed(name))
  with check (bucket_id = 'brand-assets' and public.storage_path_allowed(name));

create policy "brand_assets_delete_member" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-assets' and public.storage_path_allowed(name));

create policy "creatives_select_member" on storage.objects
  for select to authenticated
  using (bucket_id = 'creatives' and public.storage_path_allowed(name));

create policy "creatives_insert_member" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'creatives' and public.storage_path_allowed(name));

create policy "creatives_delete_member" on storage.objects
  for delete to authenticated
  using (bucket_id = 'creatives' and public.storage_path_allowed(name));

create policy "imports_select_member" on storage.objects
  for select to authenticated
  using (bucket_id = 'imports' and public.storage_path_allowed(name));

create policy "imports_insert_member" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imports' and public.storage_path_allowed(name));

create policy "imports_update_member" on storage.objects
  for update to authenticated
  using (bucket_id = 'imports' and public.storage_path_allowed(name))
  with check (bucket_id = 'imports' and public.storage_path_allowed(name));

create policy "imports_delete_member" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imports' and public.storage_path_allowed(name));

-- ---------------------------------------------------------------------------
-- 7) Org davet token tablosu (Faz 3)
-- ---------------------------------------------------------------------------
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('admin', 'member')),
  token text not null unique,
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint org_invites_email_lower check (email = lower(email))
);

create index if not exists org_invites_org_idx on public.org_invites (org_id);
create index if not exists org_invites_email_idx on public.org_invites (email)
  where accepted_at is null;

alter table public.org_invites enable row level security;

drop policy if exists "org_invites_select_admin" on public.org_invites;
create policy "org_invites_select_admin" on public.org_invites
  for select to authenticated
  using (public.is_org_admin(org_id));

drop policy if exists "org_invites_insert_admin" on public.org_invites;
create policy "org_invites_insert_admin" on public.org_invites
  for insert to authenticated
  with check (public.is_org_admin(org_id) and invited_by = (select auth.uid()));

drop policy if exists "org_invites_delete_admin" on public.org_invites;
create policy "org_invites_delete_admin" on public.org_invites
  for delete to authenticated
  using (public.is_org_admin(org_id));

grant select, insert, delete on public.org_invites to authenticated;

create or replace function public.accept_org_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.org_invites%rowtype;
  v_email text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select lower(u.email) into v_email
    from auth.users u
   where u.id = v_uid;

  select * into v_inv
    from public.org_invites i
   where i.token = p_token
   for update;

  if not found then
    raise exception 'invite not found';
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'invite already accepted';
  end if;

  if v_inv.expires_at < now() then
    raise exception 'invite expired';
  end if;

  if v_email is null or v_email <> v_inv.email then
    raise exception 'invite email mismatch';
  end if;

  insert into public.organization_members (org_id, user_id, role)
  values (v_inv.org_id, v_uid, v_inv.role)
  on conflict (org_id, user_id) do update
    set role = excluded.role;

  update public.org_invites
     set accepted_at = now()
   where id = v_inv.id;

  update public.profiles
     set active_org_id = coalesce(active_org_id, v_inv.org_id)
   where id = v_uid;

  return v_inv.org_id;
end;
$$;

revoke all on function public.accept_org_invite(text) from public, anon;
grant execute on function public.accept_org_invite(text) to authenticated, service_role;
