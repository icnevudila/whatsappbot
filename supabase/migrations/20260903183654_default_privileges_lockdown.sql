-- Varsayilan "her seye izin" davranisini kapat.
--
-- Bu projede pg_default_acl, public semasinda olusturulan her YENI tabloya
-- anon, authenticated ve service_role icin butun haklari (arwdDxtm) otomatik
-- veriyor. Sonuc: bir onceki migrasyondaki kolon bazli kisitlamalar etkisiz
-- kaldi, anon rolu bile accounts.status'u guncelleyebiliyordu. GRANT'ler
-- birikimlidir; kolon bazli bir GRANT tablo bazli olani daraltmaz.
--
-- Nisan 2026'da Supabase yeni projeler icin bu otomatik acilmayi kaldirdi ve
-- 30 Ekim 2026'da tum projelerde zorunlu olacak. Burada ayni davranisi simdi
-- devreye aliyoruz: varsayilan reddet, gereken yerde acikca ver.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
-- Fonksiyonlar da onemli: public semasindaki her yeni fonksiyona EXECUTE
-- otomatik gidiyor. SECURITY DEFINER bir fonksiyon boylece istemeden
-- herkese acik bir API ucu haline geliyor.
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;

-- Halihazirda olusmus tablolardaki genis haklari geri al.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Haklari yeniden, bu kez yalnizca gerekenler.
-- anon hicbir sey almiyor: panelin tamami oturum arkasinda.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, company, onboarding_step, onboarded_at) on public.profiles to authenticated;

-- Hesabi kullanici olusturur; baglanti durumunu ve QR'i yalnizca servis yazar.
grant select, insert, delete on public.accounts to authenticated;
grant update (label, enabled, daily_send_limit) on public.accounts to authenticated;

-- Servisin yazdigi, panelin yalnizca izledigi akislar.
grant select on public.account_events to authenticated;
grant select on public.campaign_targets to authenticated;
grant select on public.message_log to authenticated;

grant select, insert, update, delete on public.contact_lists to authenticated;

-- wa_status / wa_jid / wa_checked_at onWhatsApp() sonucudur, servise ait.
grant select, insert, delete on public.contacts to authenticated;
grant update (phone_e164, name, extra, source) on public.contacts to authenticated;

grant select, insert, update, delete on public.contact_list_members to authenticated;
grant select, insert, update, delete on public.blacklist to authenticated;

grant select, insert, update, delete on public.brand_kits to authenticated;

-- Kreatifin sonucunu (storage_path, public_url, status) servis yazar.
grant select, insert, delete on public.creatives to authenticated;

-- status, started_at ve sayaclar bilincli olarak disarida:
-- kampanya jobs tablosuna 'campaign.start' yazilarak baslatilir.
grant select, insert, delete on public.campaigns to authenticated;
grant update (
  name, message_type, body, creative_id, media_url, media_mime,
  source_list_ids, min_delay_seconds, max_delay_seconds,
  daily_cap_per_account, scheduled_at
) on public.campaigns to authenticated;

grant select, insert, delete on public.campaign_accounts to authenticated;

-- jobs: yalnizca yazip izlemek. UPDATE/DELETE verilmiyor, yoksa kullanici
-- kendi isini 'done' isaretleyip servisi atlayabilir.
grant select, insert on public.jobs to authenticated;

-- VPS servisi her seye erisir; RLS'i de bypass eder.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
