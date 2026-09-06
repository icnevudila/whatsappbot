-- Retention: completed/stopped kampanya hedefleri 90 gün; message_log 180 gün.
-- Cron zaten wa.cleanup_expired() çağırıyor (realtime_and_cron migration).

create or replace function wa.cleanup_expired()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from wa.sent_messages where created_at < now() - interval '7 days';
  delete from wa.session_lease where expires_at < now() - interval '1 hour';

  delete from public.jobs
   where status in ('done', 'cancelled', 'failed')
     and coalesce(finished_at, updated_at) < now() - interval '30 days';

  delete from public.account_events where created_at < now() - interval '90 days';

  -- Mesaj defteri: 180 gün
  delete from public.message_log where created_at < now() - interval '180 days';

  -- Bitmiş kampanyaların hedefleri: 90 gün (contacts dokunulmaz)
  delete from public.campaign_targets t
   using public.campaigns c
   where t.campaign_id = c.id
     and c.status in ('completed', 'stopped')
     and coalesce(c.completed_at, c.updated_at) < now() - interval '90 days';
end;
$$;

comment on function wa.cleanup_expired() is
  'Jobs/events + message_log(180d) + completed/stopped campaign_targets(90d).';

revoke all on function wa.cleanup_expired() from public, anon, authenticated;
grant execute on function wa.cleanup_expired() to service_role;
