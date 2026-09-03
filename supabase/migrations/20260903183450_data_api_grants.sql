-- Data API erisim haklari.
--
-- DIKKAT: Bu migrasyon tek basina yetersiz kaldi ve 20260903183654
-- (default_privileges_lockdown) tarafindan tamamlandi. Sebebi: bu projede
-- pg_default_acl, public semasindaki her yeni tabloya anon dahil butun
-- haklari otomatik veriyordu. GRANT'ler birikimli oldugu icin asagidaki
-- kolon bazli kisitlamalar hicbir sey daraltmadi. Tarihsel kayit olarak
-- burada duruyor; gecerli hak tablosu icin sonraki migrasyona bakin.
--
-- Nisan 2026'daki degisiklikten sonra public semasinda olusturulan yeni
-- tablolar Data API'ye otomatik acilmiyor. Panelin okudugu her tabloya
-- anon/authenticated haklari elle verilmek zorunda. Bu RLS'ten ayri bir
-- katman: RLS hangi SATIRLARIN gorunecegini, GRANT tablonun erisilebilir
-- olup olmadigini belirler.
--
-- anon rolune hicbir sey verilmiyor: panelin tamami oturum arkasinda.
-- Servise ait kolonlar (status, qr_code, sayaclar) kullaniciya kolon bazli
-- GRANT ile kapatiliyor; RLS kolon kisitlamasi yapamaz.

grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, company, onboarding_step, onboarded_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- accounts: hesabi kullanici olusturur, baglanti durumunu servis yazar
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.accounts to authenticated;
grant update (label, enabled, daily_send_limit) on public.accounts to authenticated;

-- ---------------------------------------------------------------------------
-- Yalnizca okunan akislar
-- ---------------------------------------------------------------------------
grant select on public.account_events to authenticated;
grant select on public.campaign_targets to authenticated;
grant select on public.message_log to authenticated;

-- ---------------------------------------------------------------------------
-- Kisiler: tam CRUD, wa dogrulama sonucu haric
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.contact_lists to authenticated;

grant select, insert, delete on public.contacts to authenticated;
grant update (phone_e164, name, extra, source) on public.contacts to authenticated;

grant select, insert, update, delete on public.contact_list_members to authenticated;
grant select, insert, update, delete on public.blacklist to authenticated;

-- ---------------------------------------------------------------------------
-- Marka kiti tam CRUD; kreatifin sonucunu servis yazar
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.brand_kits to authenticated;
grant select, insert, delete on public.creatives to authenticated;

-- ---------------------------------------------------------------------------
-- Kampanyalar: status, started_at ve sayaclar bilincli olarak disarida.
-- Kampanya jobs tablosuna 'campaign.start' yazilarak baslatilir.
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.campaigns to authenticated;
grant update (
  name, message_type, body, creative_id, media_url, media_mime,
  source_list_ids, min_delay_seconds, max_delay_seconds,
  daily_cap_per_account, scheduled_at
) on public.campaigns to authenticated;

grant select, insert, delete on public.campaign_accounts to authenticated;

-- ---------------------------------------------------------------------------
-- jobs: yalnizca yazip izlemek. UPDATE/DELETE verilmiyor, yoksa kullanici
-- kendi isini 'done' isaretleyip servisi atlayabilir.
-- ---------------------------------------------------------------------------
grant select, insert on public.jobs to authenticated;

-- ---------------------------------------------------------------------------
-- service_role: VPS servisi her seye erisir (RLS'i de bypass eder)
-- ---------------------------------------------------------------------------
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
