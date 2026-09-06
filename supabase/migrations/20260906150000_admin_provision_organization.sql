-- Platform admin: isletme + owner uyelik (self-signup kapali model).
create or replace function public.admin_provision_organization(
  p_name text,
  p_owner_user_id uuid,
  p_plan text default 'starter',
  p_accounts_quota int default null,
  p_monthly_message_quota int default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
  v_base text;
  v_i int := 0;
  v_plan text := lower(coalesce(nullif(trim(p_plan), ''), 'starter'));
  v_accounts int;
  v_messages int;
begin
  if not public.is_platform_admin() then
    raise exception 'not platform admin';
  end if;

  if p_owner_user_id is null then
    raise exception 'owner required';
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'name too short';
  end if;

  if v_plan not in ('free', 'starter', 'pro', 'enterprise') then
    v_plan := 'starter';
  end if;

  v_accounts := coalesce(
    p_accounts_quota,
    case v_plan
      when 'free' then 1
      when 'starter' then 3
      when 'pro' then 10
      else 50
    end
  );
  v_messages := coalesce(
    p_monthly_message_quota,
    case v_plan
      when 'free' then 1000
      when 'starter' then 10000
      when 'pro' then 50000
      else 500000
    end
  );

  v_base := public.slugify(p_name);
  v_slug := v_base;
  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i::text;
  end loop;

  insert into public.organizations (name, slug, plan, accounts_quota, monthly_message_quota)
  values (trim(p_name), v_slug, v_plan, v_accounts, v_messages)
  returning id into v_id;

  insert into public.organization_members (org_id, user_id, role)
  values (v_id, p_owner_user_id, 'owner')
  on conflict (org_id, user_id) do update set role = 'owner';

  update public.profiles
     set active_org_id = v_id
   where id = p_owner_user_id;

  return v_id;
end;
$$;

revoke all on function public.admin_provision_organization(text, uuid, text, int, int) from public, anon;
grant execute on function public.admin_provision_organization(text, uuid, text, int, int) to authenticated;

comment on function public.admin_provision_organization(text, uuid, text, int, int) is
  'Platform admin: isletme + owner uyelik acar.';
