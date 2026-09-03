-- Realtime yayini ve bakim gorevi.
--
-- Panel kapaliyken servis calismaya devam eder; panel acildiginda durumu
-- Realtime uzerinden ogrenir. RLS yayina da uygulanir, kullanici yalnizca
-- kendi satirlarinin degisimini gorur.

alter publication supabase_realtime add table public.accounts;
alter publication supabase_realtime add table public.account_events;
alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.campaign_targets;
alter publication supabase_realtime add table public.creatives;
alter publication supabase_realtime add table public.jobs;

-- ---------------------------------------------------------------------------
-- Gunluk bakim: sent_messages 7 gun, biten isler 7 gun, olay kaydi 30 gun.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule(
  'wa-cleanup-daily',
  '17 3 * * *',
  $$select wa.cleanup_expired()$$
);
