-- Platform admin: org detay + işletmeye geç
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
        'enabled', a.enabled,
        'is_locked', a.is_locked,
        'sent_today', a.sent_today,
        'daily_send_limit', a.daily_send_limit
      ) order by a.created_at), '[]'::jsonb)
      from public.accounts a
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
      )
    )
  );
end;
$$;

revoke all on function public.admin_org_detail(uuid) from public;
grant execute on function public.admin_org_detail(uuid) to authenticated;

create or replace function public.admin_enter_organization(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.organizations where id = p_org_id) then
    raise exception 'organization not found';
  end if;

  insert into public.organization_members (org_id, user_id, role)
  values (p_org_id, v_uid, 'admin')
  on conflict (org_id, user_id) do update
    set role = case
      when public.organization_members.role = 'owner' then 'owner'
      else 'admin'
    end;

  update public.profiles
     set active_org_id = p_org_id
   where id = v_uid;

  return jsonb_build_object('ok', true, 'org_id', p_org_id);
end;
$$;

revoke all on function public.admin_enter_organization(uuid) from public;
grant execute on function public.admin_enter_organization(uuid) to authenticated;
