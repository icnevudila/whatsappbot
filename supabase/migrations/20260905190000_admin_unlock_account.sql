-- Platform admin: kilitli hesabı aç + connect job kuyruğa al.

create or replace function public.admin_unlock_account(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.accounts%rowtype;
  v_job_id bigint;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  update public.accounts a
     set is_locked = false,
         lock_reason = null,
         locked_at = null,
         updated_at = now()
   where a.id = p_account_id
   returning * into v_row;

  if not found then
    raise exception 'account not found';
  end if;

  insert into public.jobs (
    org_id, created_by, type, payload, account_id, priority, status
  ) values (
    v_row.org_id,
    auth.uid(),
    'account.connect',
    jsonb_build_object('force', true),
    v_row.id,
    10,
    'pending'
  )
  returning id into v_job_id;

  return jsonb_build_object(
    'id', v_row.id,
    'label', v_row.label,
    'job_id', v_job_id
  );
end;
$$;

revoke all on function public.admin_unlock_account(uuid) from public;
grant execute on function public.admin_unlock_account(uuid) to authenticated;
