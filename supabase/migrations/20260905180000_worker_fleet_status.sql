create or replace function public.worker_fleet_status()
returns jsonb
language plpgsql
security definer
set search_path = public, wa
as $$
declare
  v_uid uuid := auth.uid();
  v_alive interval := interval '90 seconds';
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  return jsonb_build_object(
    'workers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'worker_id', h.worker_id,
        'max_sessions', h.max_sessions,
        'tracked', h.tracked,
        'live', h.live,
        'db_pool_max', h.db_pool_max,
        'seen_at', h.seen_at,
        'alive', h.seen_at > now() - v_alive,
        'meta', h.meta
      ) order by h.seen_at desc)
      from wa.worker_heartbeat h
    ), '[]'::jsonb),
    'leases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'account_id', a.id,
        'label', a.label,
        'phone_e164', a.phone_e164,
        'status', a.status,
        'holder_id', sl.holder_id,
        'lease_active', sl.expires_at > now()
      ) order by a.label)
      from public.accounts a
      join public.organization_members m on m.org_id = a.org_id and m.user_id = v_uid
      left join wa.session_lease sl on sl.account_id = a.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.worker_fleet_status() from public;
grant execute on function public.worker_fleet_status() to authenticated;
