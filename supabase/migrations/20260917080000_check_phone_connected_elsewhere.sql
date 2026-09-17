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
declare
  clean_target text;
  norm_e164 text;
begin
  -- Strip all non-digit characters
  clean_target := regexp_replace(coalesce(target_phone, ''), '\D', '', 'g');
  
  if length(clean_target) < 7 then
    return;
  end if;

  -- Build standard Turkish / international E.164
  if clean_target like '90%' and length(clean_target) = 12 then
    norm_e164 := '+' || clean_target;
  elsif clean_target like '0%' and length(clean_target) = 11 then
    norm_e164 := '+90' || substr(clean_target, 2);
  elsif length(clean_target) = 10 then
    norm_e164 := '+90' || clean_target;
  else
    norm_e164 := '+' || clean_target;
  end if;

  return query
  select
    true as is_connected,
    (a.org_id = current_org_id) as is_same_org,
    coalesce(o.name, 'Bilinmeyen Firma') as org_name,
    coalesce(a.label, 'WhatsApp Hattı') as account_label
  from public.accounts a
  left join public.organizations o on o.id = a.org_id
  where (
      a.phone_e164 = target_phone
      or a.phone_e164 = norm_e164
      or right(regexp_replace(coalesce(a.phone_e164, ''), '\D', '', 'g'), 10) = right(clean_target, 10)
    )
    and a.status in ('connected', 'connecting', 'qr_pending', 'pairing_pending')
    and a.enabled = true
  limit 1;
end;
$$;

grant execute on function public.check_phone_connected_elsewhere(text, uuid) to authenticated;
grant execute on function public.check_phone_connected_elsewhere(text, uuid) to service_role;

