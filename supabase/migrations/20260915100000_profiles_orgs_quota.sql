-- Kullanıcı başına sahip olunan işletme kotası (varsayılan 3, mevcut create_organization limiti).
alter table public.profiles
  add column if not exists orgs_quota integer not null default 3;

comment on column public.profiles.orgs_quota is
  'Kullanıcının sahibi olabileceği işletme sayısı. Yalnızca platform artırır; self-serve create_organization bunu okur.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_orgs_quota_range'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_orgs_quota_range
      check (orgs_quota >= 1 and orgs_quota <= 20);
  end if;
end $$;

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
  v_max_owned int := 3;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'name too short';
  end if;

  select coalesce(p.orgs_quota, 3) into v_max_owned
    from public.profiles p
   where p.id = v_uid;

  if v_max_owned is null then
    v_max_owned := 3;
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
  'Self-serve org açma. Kota: profiles.orgs_quota (sahip olunan işletmeler). Free paket 1 hat / 1000 msg.';
