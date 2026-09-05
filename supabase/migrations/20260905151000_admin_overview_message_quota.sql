-- admin_overview: organizations.monthly_message_quota
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scaler jsonb;
  v_alive int;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select count(*)::int into v_alive
  from wa.worker_heartbeat
  where seen_at > now() - interval '90 seconds';

  select jsonb_build_object(
    'desired_workers', s.desired_workers,
    'demand', s.demand,
    'alive_workers', coalesce(v_alive, 0),
    'alive_workers_reported', s.alive_workers,
    'capacity_per_worker', s.capacity_per_worker,
    'reason', s.reason,
    'updated_at', s.updated_at
  )
  into v_scaler
  from wa.scaler_state s
  where s.id = 1;

  return jsonb_build_object(
    'scaler', coalesce(v_scaler, '{}'::jsonb),
    'organizations', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'slug', o.slug,
        'plan', o.plan,
        'accounts_quota', o.accounts_quota,
        'monthly_message_quota', o.monthly_message_quota,
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
        'worker_id', h.worker_id,
        'leased_accounts', coalesce((
          select count(*)::int from wa.session_lease sl
           where sl.holder_id = h.worker_id and sl.expires_at > now()
        ), 0),
        'max_sessions', h.max_sessions,
        'tracked', h.tracked,
        'live', h.live,
        'seen_at', h.seen_at,
        'alive', h.seen_at > now() - interval '90 seconds'
      ) order by h.seen_at desc), '[]'::jsonb)
      from wa.worker_heartbeat h
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
