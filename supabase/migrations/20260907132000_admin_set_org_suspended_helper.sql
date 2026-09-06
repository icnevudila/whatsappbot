-- admin_set_org_suspended: JWT-only yerine is_platform_admin() (profile fallback dahil)
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
  if not public.is_platform_admin() then
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
