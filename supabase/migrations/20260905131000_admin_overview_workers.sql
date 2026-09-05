-- admin_overview: worker / lease dagilimi (coklu worker ops)
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'organizations', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'slug', o.slug,
        'plan', o.plan,
        'accounts_quota', o.accounts_quota,
        'member_count', (
          select count(*) from organization_members m where m.org_id = o.id
        )
      ) order by o.created_at desc), '[]'::jsonb)
      from organizations o
    ),
    'accounts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id,
        'org_id', a.org_id,
        'label', a.label,
        'phone_e164', a.phone_e164,
        'status', a.status,
        'is_locked', a.is_locked,
        'lock_reason', a.lock_reason,
        'enabled', a.enabled,
        'lease_holder', sl.holder_id,
        'lease_expires_at', sl.expires_at
      ) order by a.created_at desc), '[]'::jsonb)
      from accounts a
      left join wa.session_lease sl on sl.account_id = a.id
    ),
    'workers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'worker_id', t.holder_id,
        'leased_accounts', t.cnt,
        'soonest_expiry', t.soonest
      ) order by t.cnt desc), '[]'::jsonb)
      from (
        select
          sl.holder_id,
          count(*)::int as cnt,
          min(sl.expires_at) as soonest
        from wa.session_lease sl
        where sl.expires_at > now()
        group by sl.holder_id
      ) t
    ),
    'jobs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', j.id,
        'org_id', j.org_id,
        'type', j.type,
        'status', j.status,
        'error', j.error,
        'claimed_by', j.claimed_by,
        'updated_at', j.updated_at
      ) order by j.id desc), '[]'::jsonb)
      from (
        select * from jobs order by id desc limit 50
      ) j
    )
  );
end;
$$;

revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;
