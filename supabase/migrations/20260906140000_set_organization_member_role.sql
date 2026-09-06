-- Org admin: uye rolunu admin|member yapar; owner degistirilemez.
create or replace function public.set_organization_member_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := lower(coalesce(p_role, 'member'));
  v_target text;
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'not org admin';
  end if;

  if v_role not in ('admin', 'member') then
    raise exception 'invalid role';
  end if;

  select m.role into v_target
    from public.organization_members m
   where m.org_id = p_org_id and m.user_id = p_user_id;

  if v_target is null then
    raise exception 'member not found';
  end if;

  if v_target = 'owner' then
    raise exception 'cannot change owner role';
  end if;

  update public.organization_members
     set role = v_role
   where org_id = p_org_id and user_id = p_user_id;
end;
$$;

revoke all on function public.set_organization_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_organization_member_role(uuid, uuid, text) to authenticated;

comment on function public.set_organization_member_role(uuid, uuid, text) is
  'Org admin: uye rolunu admin|member yapar; owner degistirilemez.';
