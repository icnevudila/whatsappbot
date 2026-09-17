create or replace function public.check_phone_connected_elsewhere(
  target_phone text,
  current_org_id uuid
)
returns table (
  is_connected boolean,
  is_same_org boolean,
  org_name text,
  account_label text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    true as is_connected,
    (a.org_id = current_org_id) as is_same_org,
    o.name as org_name,
    a.label as account_label
  from public.accounts a
  join public.organizations o on o.id = a.org_id
  where a.phone_e164 = target_phone
    and a.status in ('connected', 'connecting', 'qr_pending', 'pairing_pending')
    and a.enabled = true
  limit 1;
end;
$$;

grant execute on function public.check_phone_connected_elsewhere(text, uuid) to authenticated;
