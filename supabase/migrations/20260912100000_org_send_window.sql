-- İşletme bazlı gönderim saati (Istanbul) + kampanya bekleme nedeni.

alter table public.organizations
  add column if not exists send_window_start time not null default '08:00:00',
  add column if not exists send_window_end time not null default '18:00:00';

comment on column public.organizations.send_window_start is
  'Istanbul saati. Bu saatten once kampanya ve giden mesaj durur.';
comment on column public.organizations.send_window_end is
  'Istanbul saati. Bu saatten sonra gonderim durur. start = end ise 24 saat acik.';

alter table public.campaigns
  add column if not exists wait_reason text;

comment on column public.campaigns.wait_reason is
  'running kampanyanin neden ilerlemedigi (saat araligi, gunluk kota, oturum). Servis yazar.';

grant update (send_window_start, send_window_end) on public.organizations to authenticated;

create or replace function public.org_send_gate(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota int;
  v_suspended timestamptz;
  v_used int;
  v_start time;
  v_end time;
  v_now time;
begin
  if p_org_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_org');
  end if;

  select o.monthly_message_quota, o.suspended_at, o.send_window_start, o.send_window_end
    into v_quota, v_suspended, v_start, v_end
    from public.organizations o
   where o.id = p_org_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'org_not_found');
  end if;

  if v_suspended is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'suspended',
      'quota', v_quota,
      'used', 0
    );
  end if;

  v_start := coalesce(v_start, time '08:00');
  v_end := coalesce(v_end, time '18:00');
  v_now := (now() at time zone 'Europe/Istanbul')::time;

  if v_start <> v_end then
    if v_start < v_end then
      if not (v_now >= v_start and v_now < v_end) then
        return jsonb_build_object(
          'ok', false,
          'reason', 'send_window',
          'window_start', to_char(v_start, 'HH24:MI'),
          'window_end', to_char(v_end, 'HH24:MI')
        );
      end if;
    else
      if not (v_now >= v_start or v_now < v_end) then
        return jsonb_build_object(
          'ok', false,
          'reason', 'send_window',
          'window_start', to_char(v_start, 'HH24:MI'),
          'window_end', to_char(v_end, 'HH24:MI')
        );
      end if;
    end if;
  end if;

  select count(*)::int into v_used
    from public.message_log
   where org_id = p_org_id
     and direction = 'out'
     and status in ('sent', 'delivered', 'read')
     and created_at >= date_trunc('month', timezone('utc', now()));

  if v_quota > 0 and v_used >= v_quota then
    return jsonb_build_object(
      'ok', false,
      'reason', 'monthly_quota',
      'quota', v_quota,
      'used', v_used
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'quota', v_quota,
    'used', v_used
  );
end;
$$;

revoke all on function public.org_send_gate(uuid) from public, anon, authenticated;
grant execute on function public.org_send_gate(uuid) to service_role;
