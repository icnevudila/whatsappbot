create or replace function public.admin_set_org_auto_reply(p_org_id uuid, p_enabled boolean)
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
  update public.organizations
     set auto_reply_enabled = coalesce(p_enabled, false),
         updated_at = now()
   where id = p_org_id
   returning * into v_row;
  if not found then
    raise exception 'organization not found';
  end if;
  return jsonb_build_object('id', v_row.id, 'auto_reply_enabled', v_row.auto_reply_enabled);
end;
$$;

revoke all on function public.admin_set_org_auto_reply(uuid, boolean) from public;
grant execute on function public.admin_set_org_auto_reply(uuid, boolean) to authenticated;
