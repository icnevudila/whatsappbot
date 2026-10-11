-- Additive Migration: Add p_monthly_video_quota support to public.admin_update_organization
-- This reconciles the admin action signature with the database function while strictly preserving authorization.

create or replace function public.admin_update_organization(
  p_org_id uuid,
  p_plan text default null,
  p_accounts_quota int default null,
  p_monthly_message_quota int default null,
  p_monthly_video_quota int default null
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
    raise exception 'forbidden';
  end if;

  if p_plan is not null and p_plan not in ('free', 'starter', 'pro', 'enterprise') then
    raise exception 'invalid plan';
  end if;

  update public.organizations o
     set plan = coalesce(p_plan, o.plan),
         accounts_quota = coalesce(p_accounts_quota, o.accounts_quota),
         monthly_message_quota = coalesce(p_monthly_message_quota, o.monthly_message_quota),
         monthly_video_quota = coalesce(p_monthly_video_quota, o.monthly_video_quota),
         updated_at = now()
   where o.id = p_org_id
   returning * into v_row;

  if not found then
    raise exception 'organization not found';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'plan', v_row.plan,
    'accounts_quota', v_row.accounts_quota,
    'monthly_message_quota', v_row.monthly_message_quota,
    'monthly_video_quota', v_row.monthly_video_quota
  );
end;
$$;

revoke all on function public.admin_update_organization(uuid, text, int, int, int) from public;
grant execute on function public.admin_update_organization(uuid, text, int, int, int) to authenticated;
