-- Admin org detay: hat kilidi/lease/kota + son işler/kampanyalar + aylık giden
create or replace function public.admin_org_detail(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_org from public.organizations where id = p_org_id;
  if not found then
    raise exception 'organization not found';
  end if;

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'id', v_org.id,
      'name', v_org.name,
      'slug', v_org.slug,
      'plan', v_org.plan,
      'accounts_quota', v_org.accounts_quota,
      'monthly_message_quota', v_org.monthly_message_quota,
      'suspended_at', v_org.suspended_at,
      'suspend_reason', v_org.suspend_reason,
      'auto_reply_enabled', coalesce(v_org.auto_reply_enabled, false),
      'webhook_url', v_org.webhook_url,
      'stripe_customer_id', v_org.stripe_customer_id,
      'stripe_subscription_id', v_org.stripe_subscription_id,
      'created_at', v_org.created_at
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'role', m.role,
        'created_at', m.created_at,
        'email', p.email,
        'full_name', p.full_name
      ) order by m.created_at), '[]'::jsonb)
      from public.organization_members m
      left join public.profiles p on p.id = m.user_id
      where m.org_id = p_org_id
    ),
    'accounts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id,
        'label', a.label,
        'phone_e164', a.phone_e164,
        'status', a.status,
        'status_detail', a.status_detail,
        'enabled', a.enabled,
        'is_locked', a.is_locked,
        'lock_reason', a.lock_reason,
        'locked_at', a.locked_at,
        'sent_today', a.sent_today,
        'daily_send_limit', a.daily_send_limit,
        'warmup_started_at', a.warmup_started_at,
        'new_chat_quota_total', a.new_chat_quota_total,
        'new_chat_quota_used', a.new_chat_quota_used,
        'reachout_locked_until', a.reachout_locked_until,
        'connected_at', a.connected_at,
        'last_seen_at', a.last_seen_at,
        'lease_holder', sl.holder_id,
        'lease_expires_at', sl.expires_at
      ) order by a.created_at), '[]'::jsonb)
      from public.accounts a
      left join wa.session_lease sl on sl.account_id = a.id
      where a.org_id = p_org_id
    ),
    'counts', jsonb_build_object(
      'contacts', (select count(*)::int from public.contacts c where c.org_id = p_org_id),
      'lists', (select count(*)::int from public.contact_lists cl where cl.org_id = p_org_id and coalesce(cl.source, '') <> 'quick_send'),
      'campaigns', (select count(*)::int from public.campaigns c where c.org_id = p_org_id),
      'campaigns_running', (select count(*)::int from public.campaigns c where c.org_id = p_org_id and c.status = 'running'),
      'blacklist', (select count(*)::int from public.blacklist b where b.org_id = p_org_id),
      'out_today', (
        select count(*)::int from public.message_log ml
         where ml.org_id = p_org_id and ml.direction = 'out'
           and ml.created_at >= date_trunc('day', now())
      ),
      'out_month', (
        select count(*)::int from public.message_log ml
         where ml.org_id = p_org_id and ml.direction = 'out'
           and ml.created_at >= date_trunc('month', now())
      ),
      'jobs_pending', (
        select count(*)::int from public.jobs j
         where j.org_id = p_org_id and j.status = 'pending'
      ),
      'jobs_failed', (
        select count(*)::int from public.jobs j
         where j.org_id = p_org_id and j.status = 'failed'
           and j.updated_at >= now() - interval '7 days'
      )
    ),
    'recent_jobs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', j.id,
        'type', j.type,
        'status', j.status,
        'error', j.error,
        'account_id', j.account_id,
        'claimed_by', j.claimed_by,
        'updated_at', j.updated_at
      ) order by j.id desc), '[]'::jsonb)
      from (
        select * from public.jobs where org_id = p_org_id order by id desc limit 30
      ) j
    ),
    'recent_campaigns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'status', c.status,
        'total_targets', c.total_targets,
        'sent_count', c.sent_count,
        'failed_count', c.failed_count,
        'updated_at', c.updated_at
      ) order by c.updated_at desc), '[]'::jsonb)
      from (
        select * from public.campaigns where org_id = p_org_id order by updated_at desc limit 12
      ) c
    )
  );
end;
$$;

revoke all on function public.admin_org_detail(uuid) from public;
grant execute on function public.admin_org_detail(uuid) to authenticated;

-- Worker heartbeat meta (connecting/stale) overview'da
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
        'suspended_at', o.suspended_at,
        'suspend_reason', o.suspend_reason,
        'created_at', o.created_at,
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
        'db_pool_max', h.db_pool_max,
        'seen_at', h.seen_at,
        'alive', h.seen_at > now() - interval '90 seconds',
        'meta', h.meta
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
        select * from jobs order by id desc limit 80
      ) j
    )
  );
end;
$$;

revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;
