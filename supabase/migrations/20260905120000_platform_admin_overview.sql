create or replace function public.is_platform_admin()
returns boolean language sql stable security invoker set search_path = public
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin') in ('true','1'), false); $$;

create or replace function public.admin_overview()
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'organizations', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'slug', o.slug, 'plan', o.plan,
      'accounts_quota', o.accounts_quota, 'member_count', (
        select count(*) from organization_members m where m.org_id = o.id
      )
    ) order by o.created_at desc), '[]'::jsonb) from organizations o),
    'accounts', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'org_id', a.org_id, 'label', a.label, 'phone_e164', a.phone_e164,
      'status', a.status, 'is_locked', a.is_locked, 'lock_reason', a.lock_reason,
      'enabled', a.enabled
    ) order by a.created_at desc), '[]'::jsonb) from accounts a),
    'jobs', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', j.id, 'org_id', j.org_id, 'type', j.type, 'status', j.status,
      'error', j.error, 'claimed_by', j.claimed_by, 'updated_at', j.updated_at
    ) order by j.id desc), '[]'::jsonb) from (
      select * from jobs order by id desc limit 50
    ) j)
  );
end;
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.admin_overview() from public;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.admin_overview() to authenticated;
