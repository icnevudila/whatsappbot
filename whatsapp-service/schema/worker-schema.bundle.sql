-- Filo wa-worker-kit schema bundle
-- Generated: 2026-09-06T19:38:41.232Z
-- Files: 18

-- ========== 20260903183049_extensions_and_helpers.sql ==========
-- Eklentiler ve ortak yardımcılar.
-- pgcrypto / uuid-ossp Supabase'de kurulu geliyor; pg_trgm kişi aramasi icin gerekli.

create extension if not exists pg_trgm with schema extensions;

-- updated_at kolonunu her UPDATE'te tazeleyen ortak trigger.
-- search_path bos birakiliyor: fonksiyon icinde her sey tam nitelikli yazilir,
-- boylece cagiran rolun search_path'i davranisi degistiremez.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is 'BEFORE UPDATE trigger: updated_at = now()';

-- ========== 20260903183118_core_profiles_accounts.sql ==========
-- Panel kullanicisi, WhatsApp hesaplari ve hesap olay akisi.

-- ---------------------------------------------------------------------------
-- profiles: auth.users ile 1-1
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  company text,
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'pro', 'enterprise')),
  accounts_quota int not null default 1 check (accounts_quota >= 0),
  monthly_message_quota int not null default 1000 check (monthly_message_quota >= 0),
  onboarding_step text not null default 'welcome',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Panel kullanici profili. Kota alanlari simdilik sadece kayit tutuyor, odeme entegrasyonu yok.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Yeni kullanici kaydolunca profil satiri olussun.
-- SECURITY DEFINER zorunlu: auth.users trigger'i profiles'a yazacak.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- public semasindaki SECURITY DEFINER fonksiyonlar varsayilan olarak PUBLIC'e
-- EXECUTE ile aciktir. Bu bir trigger fonksiyonu, kimsenin cagirmasi gerekmiyor.
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- accounts: bagli WhatsApp hesaplari
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  label text not null,

  -- Baglanti sonrasi servis tarafindan doldurulur.
  phone_e164 text,
  wa_jid text,
  wa_lid text,

  status text not null default 'disconnected'
    check (status in (
      'disconnected', 'connecting', 'qr_pending', 'pairing_pending',
      'connected', 'logged_out', 'banned', 'error'
    )),
  status_detail text,
  last_disconnect_code int,

  qr_code text,
  qr_expires_at timestamptz,
  pairing_code text,
  pairing_expires_at timestamptz,

  connected_at timestamptz,
  last_seen_at timestamptz,

  -- Isindirma ve gunluk kota
  warmup_started_at timestamptz,
  daily_send_limit int not null default 20 check (daily_send_limit >= 0),
  sent_today int not null default 0 check (sent_today >= 0),
  sent_today_on date,

  -- Emniyet valfi: 403 / device_removed / surekli 440 gelirse servis kilitler.
  enabled boolean not null default true,
  is_locked boolean not null default false,
  lock_reason text,
  locked_at timestamptz,

  -- Baileys tarafi
  wa_version text,
  schema_version int not null default 7,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounts_label_unique unique (owner_id, label)
);

comment on table public.accounts is 'Her satir bir WhatsApp oturumu. status ve qr alanlarini yalnizca VPS servisi yazar.';
comment on column public.accounts.schema_version is 'wa.auth_state formatinin surumu. Baileys v8 auth formatini degistirdiginde toplu migrasyon icin.';

create index accounts_owner_idx on public.accounts (owner_id);
create index accounts_status_idx on public.accounts (status) where enabled;
create unique index accounts_owner_phone_idx
  on public.accounts (owner_id, phone_e164)
  where phone_e164 is not null;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- account_events: panelin canli log akisi
-- ---------------------------------------------------------------------------
create table public.account_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade,
  level text not null default 'info'
    check (level in ('debug', 'info', 'warn', 'error')),
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index account_events_account_idx on public.account_events (account_id, id desc);
create index account_events_owner_idx on public.account_events (owner_id, id desc);

-- ========== 20260903183136_contacts.sql ==========
-- Kisi listeleri, kisiler, liste uyelikleri ve karaliste.

create table public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  source text not null default 'manual'
    check (source in ('manual', 'csv', 'xlsx', 'scraper', 'api')),
  contact_count int not null default 0 check (contact_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_lists_name_unique unique (owner_id, name)
);

create index contact_lists_owner_idx on public.contact_lists (owner_id);

create trigger contact_lists_set_updated_at
  before update on public.contact_lists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts: numaralar her zaman E.164 olarak saklanir
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  name text,
  extra jsonb not null default '{}'::jsonb,
  source text not null default 'manual'
    check (source in ('manual', 'csv', 'xlsx', 'scraper', 'api')),

  -- onWhatsApp() sonucu. Kampanya yalnizca 'valid' hedeflere gider:
  -- kayitli olmayan numaraya gonderim denemesi 463 reach-out time-lock tetikliyor.
  wa_status text not null default 'unknown'
    check (wa_status in ('unknown', 'valid', 'invalid')),
  wa_jid text,
  wa_checked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_phone_unique unique (owner_id, phone_e164)
);

comment on column public.contacts.wa_status is 'onWhatsApp() dogrulama onbellegi. Gonderim yolunda zorunlu kapi.';

create index contacts_owner_idx on public.contacts (owner_id);
create index contacts_wa_status_idx on public.contacts (owner_id, wa_status);
create index contacts_name_trgm_idx
  on public.contacts using gin (name extensions.gin_trgm_ops);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contact_list_members
-- ---------------------------------------------------------------------------
create table public.contact_list_members (
  list_id uuid not null references public.contact_lists (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, contact_id)
);

create index contact_list_members_contact_idx on public.contact_list_members (contact_id);
create index contact_list_members_owner_idx on public.contact_list_members (owner_id);

-- ---------------------------------------------------------------------------
-- blacklist: bir daha asla mesaj gitmeyecek numaralar
-- ---------------------------------------------------------------------------
create table public.blacklist (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  phone_e164 text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint blacklist_phone_unique unique (owner_id, phone_e164)
);

create index blacklist_owner_idx on public.blacklist (owner_id);

-- ========== 20260903183154_brand_kits_creatives.sql ==========
-- Marka kiti ve uretilen kreatifler.

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  logo_path text,
  colors jsonb not null default
    '{"primary":"#111111","secondary":"#4b5563","accent":"#2563eb","background":"#ffffff","text":"#111111"}'::jsonb,
  fonts jsonb not null default '{"heading":"Inter","body":"Inter"}'::jsonb,
  tone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_kits_name_unique unique (owner_id, name)
);

comment on column public.brand_kits.logo_path is 'brand-assets bucket icindeki yol. Bucket ozel, imzali URL ile okunur.';

create index brand_kits_owner_idx on public.brand_kits (owner_id);

-- Kullanici basina en fazla bir varsayilan kit.
create unique index brand_kits_one_default_idx
  on public.brand_kits (owner_id)
  where is_default;

create trigger brand_kits_set_updated_at
  before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- creatives: satori -> resvg ile uretilen PNG'ler
-- ---------------------------------------------------------------------------
create table public.creatives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_kit_id uuid references public.brand_kits (id) on delete set null,
  template text not null default 'basic',
  format text not null default 'feed'
    check (format in ('story', 'feed', 'square')),
  payload jsonb not null default '{}'::jsonb,

  storage_path text,
  public_url text,
  width int check (width > 0),
  height int check (height > 0),

  status text not null default 'pending'
    check (status in ('pending', 'rendering', 'ready', 'failed')),
  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Baileys mediaCache anahtari yalnizca "tip + URL"; icerik hash'i degil.
-- Bu yuzden ayni yola dosya ustune yazilmaz, her kreatif yeni bir yol alir.
comment on column public.creatives.public_url is 'creatives bucket public URL. mediaCache''in isini gormesi icin sabit ve tekrar kullanilabilir olmali.';
comment on column public.creatives.storage_path is 'Her render yeni yol alir; ayni URL uzerine dosya degistirilmez.';

create index creatives_owner_idx on public.creatives (owner_id, created_at desc);
create index creatives_status_idx on public.creatives (status) where status in ('pending', 'rendering');

create trigger creatives_set_updated_at
  before update on public.creatives
  for each row execute function public.set_updated_at();

-- ========== 20260903183218_campaigns.sql ==========
-- Kampanyalar, gonderen hesap eslestirmeleri, hedefler ve mesaj kaydi.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,

  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'running', 'paused', 'completed', 'stopped', 'failed')),

  message_type text not null default 'text'
    check (message_type in ('text', 'image', 'video', 'document')),
  body text,
  creative_id uuid references public.creatives (id) on delete set null,
  media_url text,
  media_mime text,

  -- Hedefler campaign_targets'a materyalize edilir; bu alan yalnizca kayit.
  source_list_ids uuid[] not null default '{}',

  -- Hiz ve kota. Varsayilanlar bilincli olarak yavas.
  min_delay_seconds int not null default 15 check (min_delay_seconds >= 3),
  max_delay_seconds int not null default 45 check (max_delay_seconds >= 3),
  daily_cap_per_account int not null default 50 check (daily_cap_per_account > 0),

  scheduled_at timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  stop_reason text,

  total_targets int not null default 0 check (total_targets >= 0),
  sent_count int not null default 0 check (sent_count >= 0),
  failed_count int not null default 0 check (failed_count >= 0),
  skipped_count int not null default 0 check (skipped_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaigns_delay_order check (max_delay_seconds >= min_delay_seconds)
);

comment on table public.campaigns is 'status ve sayaclari yalnizca servis yazar. Panel kampanyayi jobs tablosuna komut yazarak baslatir.';

create index campaigns_owner_idx on public.campaigns (owner_id, created_at desc);
create index campaigns_active_idx on public.campaigns (status) where status in ('scheduled', 'running');

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_accounts: kampanyanin hangi hesaplardan gonderecegi
-- ---------------------------------------------------------------------------
create table public.campaign_accounts (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  sent_count int not null default 0 check (sent_count >= 0),
  primary key (campaign_id, account_id)
);

create index campaign_accounts_account_idx on public.campaign_accounts (account_id);
create index campaign_accounts_owner_idx on public.campaign_accounts (owner_id);

-- ---------------------------------------------------------------------------
-- campaign_targets: hedef basina durum
-- ---------------------------------------------------------------------------
create table public.campaign_targets (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  phone_e164 text not null,

  -- Gonderimi yapan hesap; rotasyon isci tarafinda.
  account_id uuid references public.accounts (id) on delete set null,

  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  attempts int not null default 0 check (attempts >= 0),
  personalized_body text,
  wa_message_id text,
  error text,

  scheduled_for timestamptz,
  sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaign_targets_unique unique (campaign_id, phone_e164)
);

create index campaign_targets_campaign_status_idx on public.campaign_targets (campaign_id, status);
create index campaign_targets_claim_idx
  on public.campaign_targets (campaign_id, scheduled_for, id)
  where status = 'queued';
create index campaign_targets_owner_idx on public.campaign_targets (owner_id, id desc);

create trigger campaign_targets_set_updated_at
  before update on public.campaign_targets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- message_log: giden ve gelen mesajlarin panel gorunumu
-- ---------------------------------------------------------------------------
create table public.message_log (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  direction text not null default 'out' check (direction in ('out', 'in')),
  remote_jid text,
  phone_e164 text,
  message_type text not null default 'text',
  body text,
  media_url text,
  wa_message_id text,
  status text not null default 'sent'
    check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index message_log_owner_idx on public.message_log (owner_id, id desc);
create index message_log_account_idx on public.message_log (account_id, id desc);
create index message_log_campaign_idx on public.message_log (campaign_id, id desc);

-- ========== 20260903183233_jobs_command_bus.sql ==========
-- jobs: panel ile VPS servisi arasindaki tek iletisim kanali.
-- Panel satir yazar, VPS ceker. Boylece VPS'te internete acik port yok.

create table public.jobs (
  id bigint generated always as identity primary key,

  -- Sistem isleri icin owner_id bos olabilir.
  owner_id uuid references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,

  type text not null check (type in (
    'account.connect',
    'account.disconnect',
    'account.logout',
    'account.request_pairing_code',
    'message.send',
    'contacts.verify',
    'creative.render',
    'campaign.start',
    'campaign.pause',
    'campaign.resume',
    'campaign.stop'
  )),
  payload jsonb not null default '{}'::jsonb,

  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'running', 'done', 'failed', 'cancelled')),
  priority int not null default 100,
  run_after timestamptz not null default now(),

  attempts int not null default 0 check (attempts >= 0),
  max_attempts int not null default 3 check (max_attempts > 0),

  claimed_by text,
  claimed_at timestamptz,
  finished_at timestamptz,
  result jsonb,
  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.jobs is 'Komut kuyrugu. Panel INSERT eder, servis FOR UPDATE SKIP LOCKED ile alir. Durum kolonlarini panel yazamaz.';

-- Kuyruk taramasi yalnizca bekleyen isleri gezer.
create index jobs_queue_idx
  on public.jobs (priority, run_after, id)
  where status = 'pending';
create index jobs_owner_idx on public.jobs (owner_id, id desc);
create index jobs_account_idx on public.jobs (account_id, id desc);
create index jobs_cleanup_idx
  on public.jobs (finished_at)
  where status in ('done', 'cancelled');

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- ========== 20260903183405_wa_private_schema.sql ==========
-- wa semasi: Baileys auth state, oturum kirasi, getMessage deposu.
-- Bu sema Data API'ye ASLA acilmaz. Icindeki Signal ozel anahtarlari
-- sizarsa ilgili WhatsApp hesabinin tam kontrolu demektir.

create schema if not exists wa;

comment on schema wa is 'Ozel sema. Yalnizca service_role erisir; anon/authenticated hicbir hak almaz.';

revoke all on schema wa from public, anon, authenticated;

grant usage on schema wa to service_role;

-- ---------------------------------------------------------------------------
-- wa.creds: Baileys AuthenticationCreds (hesap basina tek satir)
-- ---------------------------------------------------------------------------
create table wa.creds (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  value jsonb not null,
  schema_version int not null default 7,
  updated_at timestamptz not null default now()
);

comment on table wa.creds is 'BufferJSON ile serilestirilmis AuthenticationCreds. saveCreds() burayi gunceller.';

-- ---------------------------------------------------------------------------
-- wa.auth_state: SignalKeyStore
-- ---------------------------------------------------------------------------
create table wa.auth_state (
  account_id uuid not null references public.accounts (id) on delete cascade,
  type text not null,
  key_id text not null,
  value jsonb not null,
  schema_version int not null default 7,
  updated_at timestamptz not null default now(),
  primary key (account_id, type, key_id)
);

comment on table wa.auth_state is 'Baileys SignalDataTypeMap deposu. v7 tipleri: pre-key, session, sender-key, sender-key-memory, app-state-sync-key, app-state-sync-version, identity-key, lid-mapping, device-list, tctoken. type bilincli olarak serbest metin: v8 yeni tip getirirse sema degismez.';

comment on column wa.auth_state.value is 'BufferJSON ile serilestirilmis deger. Okumada app-state-sync-key ozel canlandirma gerektirir.';

-- ---------------------------------------------------------------------------
-- wa.session_lease: ayni hesabin iki yerde acilmasini engeller
-- ---------------------------------------------------------------------------
-- Ayni hesap iki process'te acilirsa WhatsApp connectionReplaced (440) dongusune
-- ve device_removed'a gider. Kira alinmadan socket acilmaz.
create sequence wa.session_epoch_seq as bigint;

create table wa.session_lease (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  holder_id text not null,
  epoch bigint not null,
  acquired_at timestamptz not null default now(),
  renewed_at timestamptz not null default now(),
  expires_at timestamptz not null
);

comment on table wa.session_lease is 'Oturum kirasi ve monotonik epoch cit. Zombi process''in auth yazmasini no-op yapar.';

create index session_lease_expires_idx on wa.session_lease (expires_at);

-- ---------------------------------------------------------------------------
-- wa.sent_messages: getMessage sozlesmesi
-- ---------------------------------------------------------------------------
-- getMessage saglanmazsa alicida "this message can take a while" kaliyor.
create table wa.sent_messages (
  account_id uuid not null references public.accounts (id) on delete cascade,
  msg_id text not null,
  remote_jid text not null,
  message jsonb not null,
  created_at timestamptz not null default now(),
  primary key (account_id, msg_id)
);

create index sent_messages_created_idx on wa.sent_messages (created_at);

-- ---------------------------------------------------------------------------
-- Savunma katmani olarak RLS. service_role bypassrls tasidigi icin etkilenmez;
-- baska bir rol yanlislikla hak alirsa satirlari goremez.
-- ---------------------------------------------------------------------------
alter table wa.creds enable row level security;
alter table wa.auth_state enable row level security;
alter table wa.session_lease enable row level security;
alter table wa.sent_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Kira fonksiyonlari
-- ---------------------------------------------------------------------------

-- Kira ya bostur, ya suresi gecmistir, ya da zaten bizimdir; aksi halde alinmaz.
-- jsonb donuyor cunku cikti kolonu adiyla tablo kolonu adi cakisiyor.
create or replace function wa.acquire_lease(
  p_account_id uuid,
  p_holder_id text,
  p_ttl_seconds int default 60
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_epoch bigint;
  v_holder text;
begin
  insert into wa.session_lease as sl (account_id, holder_id, epoch, expires_at)
  values (
    p_account_id,
    p_holder_id,
    nextval('wa.session_epoch_seq'),
    now() + make_interval(secs => p_ttl_seconds)
  )
  on conflict (account_id) do update
    set holder_id = excluded.holder_id,
        epoch = excluded.epoch,
        acquired_at = now(),
        renewed_at = now(),
        expires_at = excluded.expires_at
    where sl.expires_at < now()
       or sl.holder_id = excluded.holder_id
  returning sl.epoch into v_epoch;

  if v_epoch is not null then
    return jsonb_build_object('acquired', true, 'epoch', v_epoch);
  end if;

  -- Kira baskasinda ve hala gecerli.
  select sl2.holder_id, sl2.epoch
    into v_holder, v_epoch
    from wa.session_lease sl2
   where sl2.account_id = p_account_id;

  return jsonb_build_object(
    'acquired', false,
    'epoch', v_epoch,
    'holder_id', v_holder
  );
end;
$$;

-- Yenileme false donerse kira baskasina gecmis: socket derhal atilir.
-- Yenileme HATA verirse (veritabani erisilemez) socket atilmaz; gecici bir
-- kesinti kendi kendine yaratilmis arizaya donusmemeli.
create or replace function wa.renew_lease(
  p_account_id uuid,
  p_holder_id text,
  p_epoch bigint,
  p_ttl_seconds int default 60
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update wa.session_lease
     set renewed_at = now(),
         expires_at = now() + make_interval(secs => p_ttl_seconds)
   where account_id = p_account_id
     and holder_id = p_holder_id
     and epoch = p_epoch;
  return found;
end;
$$;

-- Kapanis sirasi kritik: once sock.end(), ANCAK socket kapandiktan sonra burasi.
-- Ters sirada yeni sahip eski socket hala acikken baglanir ve 440 dongusu baslar.
create or replace function wa.release_lease(
  p_account_id uuid,
  p_holder_id text,
  p_epoch bigint
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from wa.session_lease
   where account_id = p_account_id
     and holder_id = p_holder_id
     and epoch = p_epoch;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Komut kuyrugu tuketicisi
-- ---------------------------------------------------------------------------
create or replace function wa.claim_jobs(
  p_worker_id text,
  p_limit int default 10
)
returns setof public.jobs
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select j.id
      from public.jobs j
     where j.status = 'pending'
       and j.run_after <= now()
     order by j.priority, j.run_after, j.id
     limit p_limit
     for update skip locked
  )
  update public.jobs j
     set status = 'claimed',
         claimed_by = p_worker_id,
         claimed_at = now(),
         attempts = j.attempts + 1,
         updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bakim
-- ---------------------------------------------------------------------------
create or replace function wa.cleanup_expired()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- getMessage yalnizca yakin gecmis icin gerekli.
  delete from wa.sent_messages where created_at < now() - interval '7 days';

  delete from wa.session_lease where expires_at < now() - interval '1 hour';

  delete from public.jobs
   where status in ('done', 'cancelled')
     and finished_at < now() - interval '7 days';

  delete from public.account_events where created_at < now() - interval '30 days';
end;
$$;

-- Fonksiyonlar wa semasinda ve SECURITY INVOKER; yine de PUBLIC'in varsayilan
-- EXECUTE hakki aciktan geri aliniyor.
revoke all on all functions in schema wa from public, anon, authenticated;
grant execute on all functions in schema wa to service_role;
grant all on all tables in schema wa to service_role;
grant usage on all sequences in schema wa to service_role;

-- ========== 20260903184500_account_reachout_quota.sql ==========
-- WhatsApp'in gercek "yeni sohbet mesaj kotasi" ve reach-out time-lock durumu.
--
-- Baileys rc14'te bu bilgiyi veren iki uc var: fetchNewChatMessageCap() ve
-- fetchAccountReachoutTimelock(), ayrica canli 'message-capping.update' olayi.
-- Bu, ban'in bilinen teknik sebebini tahmin etmek yerine sunucudan okumamizi
-- sagliyor: 463 reach-out time-lock, tanimadigi kisilere gonderim butcesi
-- tukendiginde geliyor. Kampanya motoru kotaya bakip kendini durduracak.

alter table public.accounts
  add column new_chat_quota_total int,
  add column new_chat_quota_used int,
  add column new_chat_quota_cycle_end timestamptz,
  add column reachout_locked_until timestamptz,
  add column reachout_lock_type text;

comment on column public.accounts.new_chat_quota_total is 'WhatsApp new-chat message cap: donem basina tanimadigi kisiye gonderim kotasi. Baileys message-capping.update olayindan gelir.';
comment on column public.accounts.new_chat_quota_used is 'Ayni donemde kullanilan kota. Kampanya motoru buna bakip durur.';
comment on column public.accounts.reachout_locked_until is '463 reach-out time-lock bitis zamani. Doluysa kampanya baslatilmaz.';

-- ========== 20260904160000_organizations_tenancy.sql ==========
-- Cok kiracili isletme (organization) modeli.
-- owner_id (kullanici) → org_id (kiraci) + created_by (denetim).

-- ---------------------------------------------------------------------------
-- 1) organizations + members
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'pro', 'enterprise')),
  accounts_quota int not null default 1 check (accounts_quota >= 0),
  monthly_message_quota int not null default 1000 check (monthly_message_quota >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_unique unique (slug)
);

comment on table public.organizations is
  'Kiraci birimi (isletme). Kota/plan burada; panel UI adi: Isletme.';

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index organization_members_user_idx
  on public.organization_members (user_id);

comment on table public.organization_members is
  'Isletme uyeligi. owner/admin yonetir; member is verisi okur/yazar.';

-- profiles: aktif isletme
alter table public.profiles
  add column if not exists active_org_id uuid;

-- ---------------------------------------------------------------------------
-- 2) RLS helper fonksiyonlari
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.org_id = p_org_id
       and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.org_id = p_org_id
       and m.user_id = (select auth.uid())
       and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id
    from public.organization_members m
   where m.user_id = (select auth.uid());
$$;

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.is_org_admin(uuid) from public, anon;
revoke all on function public.user_org_ids() from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.is_org_admin(uuid) to authenticated, service_role;
grant execute on function public.user_org_ids() to authenticated, service_role;

create or replace function public.slugify(p_text text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  s text;
begin
  s := lower(coalesce(p_text, ''));
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := trim(both '-' from s);
  if s = '' then
    s := 'isletme';
  end if;
  return left(s, 48);
end;
$$;

revoke all on function public.slugify(text) from public, anon;
-- slugify yalnizca definer fonksiyonlar icinde; authenticated RPC gerekmez
grant execute on function public.slugify(text) to service_role;

-- Atomik isletme olusturma (uye + active_org)
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_slug text;
  v_base text;
  v_i int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'name too short';
  end if;

  v_base := public.slugify(p_name);
  v_slug := v_base;

  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i::text;
  end loop;

  insert into public.organizations (name, slug)
  values (trim(p_name), v_slug)
  returning id into v_id;

  insert into public.organization_members (org_id, user_id, role)
  values (v_id, v_uid, 'owner');

  update public.profiles
     set active_org_id = v_id
   where id = v_uid;

  return v_id;
end;
$$;

revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated, service_role;

-- E-posta ile uye ekleme (yalnizca admin+)
create or replace function public.add_organization_member(
  p_org_id uuid,
  p_email text,
  p_role text default 'member'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_role text := lower(coalesce(p_role, 'member'));
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'not org admin';
  end if;

  if v_role not in ('admin', 'member') then
    raise exception 'invalid role';
  end if;

  select p.id into v_uid
    from public.profiles p
   where lower(p.email) = lower(trim(p_email))
   limit 1;

  if v_uid is null then
    raise exception 'user not found';
  end if;

  if exists (
    select 1 from public.organization_members m
     where m.org_id = p_org_id and m.user_id = v_uid and m.role = 'owner'
  ) then
    raise exception 'cannot change owner via this function';
  end if;

  insert into public.organization_members (org_id, user_id, role)
  values (p_org_id, v_uid, v_role)
  on conflict (org_id, user_id) do update
    set role = excluded.role;
end;
$$;

revoke all on function public.add_organization_member(uuid, text, text) from public, anon;
grant execute on function public.add_organization_member(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Tenant tablolarina org_id ekle (nullable → backfill → not null)
-- ---------------------------------------------------------------------------
alter table public.accounts add column if not exists org_id uuid;
alter table public.account_events add column if not exists org_id uuid;
alter table public.contact_lists add column if not exists org_id uuid;
alter table public.contacts add column if not exists org_id uuid;
alter table public.contact_list_members add column if not exists org_id uuid;
alter table public.blacklist add column if not exists org_id uuid;
alter table public.brand_kits add column if not exists org_id uuid;
alter table public.creatives add column if not exists org_id uuid;
alter table public.campaigns add column if not exists org_id uuid;
alter table public.campaign_accounts add column if not exists org_id uuid;
alter table public.campaign_targets add column if not exists org_id uuid;
alter table public.message_log add column if not exists org_id uuid;
alter table public.jobs add column if not exists org_id uuid;

-- ---------------------------------------------------------------------------
-- 4) Backfill: her profil → bir isletme
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_org uuid;
  v_slug text;
  v_base text;
  v_name text;
  v_i int;
begin
  for r in
    select p.id, p.email, p.full_name, p.company, p.plan,
           p.accounts_quota, p.monthly_message_quota
      from public.profiles p
  loop
    v_name := coalesce(
      nullif(trim(r.company), ''),
      nullif(trim(r.full_name), ''),
      split_part(coalesce(r.email, 'isletme'), '@', 1),
      'Isletme'
    );
    v_base := public.slugify(v_name || '-' || left(replace(r.id::text, '-', ''), 8));
    v_slug := v_base;
    v_i := 0;
    while exists (select 1 from public.organizations o where o.slug = v_slug) loop
      v_i := v_i + 1;
      v_slug := v_base || '-' || v_i::text;
    end loop;

    insert into public.organizations (
      name, slug, plan, accounts_quota, monthly_message_quota
    ) values (
      v_name,
      v_slug,
      coalesce(r.plan, 'free'),
      coalesce(r.accounts_quota, 1),
      coalesce(r.monthly_message_quota, 1000)
    )
    returning id into v_org;

    insert into public.organization_members (org_id, user_id, role)
    values (v_org, r.id, 'owner')
    on conflict do nothing;

    update public.profiles set active_org_id = v_org where id = r.id;

    update public.accounts set org_id = v_org where owner_id = r.id and org_id is null;
    update public.account_events set org_id = v_org where owner_id = r.id and org_id is null;
    update public.contact_lists set org_id = v_org where owner_id = r.id and org_id is null;
    update public.contacts set org_id = v_org where owner_id = r.id and org_id is null;
    update public.contact_list_members set org_id = v_org where owner_id = r.id and org_id is null;
    update public.blacklist set org_id = v_org where owner_id = r.id and org_id is null;
    update public.brand_kits set org_id = v_org where owner_id = r.id and org_id is null;
    update public.creatives set org_id = v_org where owner_id = r.id and org_id is null;
    update public.campaigns set org_id = v_org where owner_id = r.id and org_id is null;
    update public.campaign_accounts set org_id = v_org where owner_id = r.id and org_id is null;
    update public.campaign_targets set org_id = v_org where owner_id = r.id and org_id is null;
    update public.message_log set org_id = v_org where owner_id = r.id and org_id is null;
    update public.jobs set org_id = v_org where owner_id = r.id and org_id is null;
  end loop;
end;
$$;

-- Orphan / sistem isleri: org yoksa null kalsin (yalnizca jobs)
-- Diger tablolarda org zorunlu
do $$
begin
  if exists (select 1 from public.accounts where org_id is null) then
    raise exception 'accounts backfill incomplete';
  end if;
  if exists (select 1 from public.contacts where org_id is null) then
    raise exception 'contacts backfill incomplete';
  end if;
  if exists (select 1 from public.campaigns where org_id is null) then
    raise exception 'campaigns backfill incomplete';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) owner_id → created_by rename
-- ---------------------------------------------------------------------------
alter table public.accounts rename column owner_id to created_by;
alter table public.account_events rename column owner_id to created_by;
alter table public.contact_lists rename column owner_id to created_by;
alter table public.contacts rename column owner_id to created_by;
alter table public.contact_list_members rename column owner_id to created_by;
alter table public.blacklist rename column owner_id to created_by;
alter table public.brand_kits rename column owner_id to created_by;
alter table public.creatives rename column owner_id to created_by;
alter table public.campaigns rename column owner_id to created_by;
alter table public.campaign_accounts rename column owner_id to created_by;
alter table public.campaign_targets rename column owner_id to created_by;
alter table public.message_log rename column owner_id to created_by;
alter table public.jobs rename column owner_id to created_by;

-- ---------------------------------------------------------------------------
-- 6) FK + NOT NULL org_id + unique/index yenileme
-- ---------------------------------------------------------------------------
alter table public.accounts
  alter column org_id set not null,
  add constraint accounts_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.account_events
  alter column org_id set not null,
  add constraint account_events_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.contact_lists
  alter column org_id set not null,
  add constraint contact_lists_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.contacts
  alter column org_id set not null,
  add constraint contacts_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.contact_list_members
  alter column org_id set not null,
  add constraint contact_list_members_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.blacklist
  alter column org_id set not null,
  add constraint blacklist_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.brand_kits
  alter column org_id set not null,
  add constraint brand_kits_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.creatives
  alter column org_id set not null,
  add constraint creatives_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.campaigns
  alter column org_id set not null,
  add constraint campaigns_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.campaign_accounts
  alter column org_id set not null,
  add constraint campaign_accounts_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.campaign_targets
  alter column org_id set not null,
  add constraint campaign_targets_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.message_log
  alter column org_id set not null,
  add constraint message_log_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

-- jobs.org_id nullable (sistem isleri)
alter table public.jobs
  add constraint jobs_org_id_fkey
    foreign key (org_id) references public.organizations (id) on delete cascade;

alter table public.profiles
  add constraint profiles_active_org_id_fkey
    foreign key (active_org_id) references public.organizations (id) on delete set null;

-- Unique: eski owner bazli → org bazli
alter table public.accounts drop constraint if exists accounts_label_unique;
alter table public.accounts
  add constraint accounts_label_unique unique (org_id, label);

drop index if exists public.accounts_owner_phone_idx;
create unique index accounts_org_phone_idx
  on public.accounts (org_id, phone_e164)
  where phone_e164 is not null;

alter table public.contact_lists drop constraint if exists contact_lists_name_unique;
alter table public.contact_lists
  add constraint contact_lists_name_unique unique (org_id, name);

alter table public.contacts drop constraint if exists contacts_phone_unique;
alter table public.contacts
  add constraint contacts_phone_unique unique (org_id, phone_e164);

alter table public.blacklist drop constraint if exists blacklist_phone_unique;
alter table public.blacklist
  add constraint blacklist_phone_unique unique (org_id, phone_e164);

alter table public.brand_kits drop constraint if exists brand_kits_name_unique;
alter table public.brand_kits
  add constraint brand_kits_name_unique unique (org_id, name);

-- Index yenile
drop index if exists public.accounts_owner_idx;
create index accounts_org_idx on public.accounts (org_id);

drop index if exists public.account_events_owner_idx;
create index account_events_org_idx on public.account_events (org_id, id desc);

drop index if exists public.contact_lists_owner_idx;
create index contact_lists_org_idx on public.contact_lists (org_id);

drop index if exists public.contacts_owner_idx;
create index contacts_org_idx on public.contacts (org_id);

drop index if exists public.contacts_wa_status_idx;
create index contacts_wa_status_idx on public.contacts (org_id, wa_status);

drop index if exists public.contact_list_members_owner_idx;
create index contact_list_members_org_idx on public.contact_list_members (org_id);

drop index if exists public.blacklist_owner_idx;
create index blacklist_org_idx on public.blacklist (org_id);

drop index if exists public.brand_kits_owner_idx;
create index brand_kits_org_idx on public.brand_kits (org_id);

drop index if exists public.brand_kits_one_default_idx;
create unique index brand_kits_one_default_idx
  on public.brand_kits (org_id)
  where is_default;

drop index if exists public.creatives_owner_idx;
create index creatives_org_idx on public.creatives (org_id, created_at desc);

drop index if exists public.campaigns_owner_idx;
create index campaigns_org_idx on public.campaigns (org_id, created_at desc);

drop index if exists public.campaign_accounts_owner_idx;
create index campaign_accounts_org_idx on public.campaign_accounts (org_id);

drop index if exists public.campaign_targets_owner_idx;
create index campaign_targets_org_idx on public.campaign_targets (org_id, id desc);

drop index if exists public.message_log_owner_idx;
create index message_log_org_idx on public.message_log (org_id, id desc);

drop index if exists public.message_log_inbound_idx;
create index message_log_inbound_idx
  on public.message_log (org_id, id desc)
  where direction = 'in';

drop index if exists public.message_log_phone_idx;
create index message_log_phone_idx
  on public.message_log (org_id, phone_e164, id)
  where phone_e164 is not null;

drop index if exists public.jobs_owner_idx;
create index jobs_org_idx on public.jobs (org_id, id desc);
create index jobs_created_by_idx on public.jobs (created_by, id desc);

-- ---------------------------------------------------------------------------
-- 7) Junction org tutarliligi
-- ---------------------------------------------------------------------------
create or replace function public.enforce_campaign_account_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.campaigns c
     where c.id = new.campaign_id and c.org_id = new.org_id
  ) then
    raise exception 'campaign_accounts: campaign org mismatch';
  end if;

  if not exists (
    select 1 from public.accounts a
     where a.id = new.account_id and a.org_id = new.org_id
  ) then
    raise exception 'campaign_accounts: account org mismatch';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_list_member_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.contact_lists l
     where l.id = new.list_id and l.org_id = new.org_id
  ) then
    raise exception 'contact_list_members: list org mismatch';
  end if;

  if not exists (
    select 1 from public.contacts c
     where c.id = new.contact_id and c.org_id = new.org_id
  ) then
    raise exception 'contact_list_members: contact org mismatch';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) handle_new_user: profil + kisisel org
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_name text;
  v_slug text;
  v_base text;
  v_i int := 0;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'company', ''),
    split_part(coalesce(new.email, 'isletme'), '@', 1),
    'Isletme'
  );
  v_base := public.slugify(v_name || '-' || left(replace(new.id::text, '-', ''), 8));
  v_slug := v_base;
  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i::text;
  end loop;

  insert into public.organizations (name, slug)
  values (v_name, v_slug)
  returning id into v_org;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org, new.id, 'owner')
  on conflict do nothing;

  update public.profiles
     set active_org_id = v_org
   where id = new.id
     and active_org_id is null;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9) RLS: eski politikalar → org uyelik
-- ---------------------------------------------------------------------------
drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_own" on public.accounts;

drop policy if exists "account_events_select_own" on public.account_events;
drop policy if exists "campaign_targets_select_own" on public.campaign_targets;
drop policy if exists "message_log_select_own" on public.message_log;

drop policy if exists "contact_lists_select_own" on public.contact_lists;
drop policy if exists "contact_lists_insert_own" on public.contact_lists;
drop policy if exists "contact_lists_update_own" on public.contact_lists;
drop policy if exists "contact_lists_delete_own" on public.contact_lists;

drop policy if exists "contacts_select_own" on public.contacts;
drop policy if exists "contacts_insert_own" on public.contacts;
drop policy if exists "contacts_update_own" on public.contacts;
drop policy if exists "contacts_delete_own" on public.contacts;

drop policy if exists "contact_list_members_select_own" on public.contact_list_members;
drop policy if exists "contact_list_members_insert_own" on public.contact_list_members;
drop policy if exists "contact_list_members_update_own" on public.contact_list_members;
drop policy if exists "contact_list_members_delete_own" on public.contact_list_members;

drop policy if exists "blacklist_select_own" on public.blacklist;
drop policy if exists "blacklist_insert_own" on public.blacklist;
drop policy if exists "blacklist_update_own" on public.blacklist;
drop policy if exists "blacklist_delete_own" on public.blacklist;

drop policy if exists "brand_kits_select_own" on public.brand_kits;
drop policy if exists "brand_kits_insert_own" on public.brand_kits;
drop policy if exists "brand_kits_update_own" on public.brand_kits;
drop policy if exists "brand_kits_delete_own" on public.brand_kits;

drop policy if exists "creatives_select_own" on public.creatives;
drop policy if exists "creatives_insert_own" on public.creatives;
drop policy if exists "creatives_delete_own" on public.creatives;

drop policy if exists "campaigns_select_own" on public.campaigns;
drop policy if exists "campaigns_insert_own" on public.campaigns;
drop policy if exists "campaigns_update_own" on public.campaigns;
drop policy if exists "campaigns_delete_own" on public.campaigns;

drop policy if exists "campaign_accounts_select_own" on public.campaign_accounts;
drop policy if exists "campaign_accounts_insert_own" on public.campaign_accounts;
drop policy if exists "campaign_accounts_delete_own" on public.campaign_accounts;

drop policy if exists "jobs_select_own" on public.jobs;
drop policy if exists "jobs_insert_own" on public.jobs;

-- profiles: active_org_id guncellenebilir
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "organizations_select_member" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy "organizations_update_admin" on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- Insert dogrudan kapali; create_organization() security definer kullan
-- (RLS insert yok → authenticated INSERT grant olsa bile satir yazilamaz;
--  fonksiyon security definer ile yazar)

create policy "organization_members_select" on public.organization_members
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "organization_members_delete_admin" on public.organization_members
  for delete to authenticated
  using (
    public.is_org_admin(org_id)
    and role <> 'owner'
  );

-- Tenant tablolari: uye okur/yazar
create policy "accounts_select_member" on public.accounts
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "accounts_insert_member" on public.accounts
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "accounts_update_member" on public.accounts
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "accounts_delete_member" on public.accounts
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "account_events_select_member" on public.account_events
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "campaign_targets_select_member" on public.campaign_targets
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "message_log_select_member" on public.message_log
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "contact_lists_select_member" on public.contact_lists
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "contact_lists_insert_member" on public.contact_lists
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "contact_lists_update_member" on public.contact_lists
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "contact_lists_delete_member" on public.contact_lists
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "contacts_select_member" on public.contacts
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "contacts_insert_member" on public.contacts
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "contacts_update_member" on public.contacts
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "contacts_delete_member" on public.contacts
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "contact_list_members_select_member" on public.contact_list_members
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "contact_list_members_insert_member" on public.contact_list_members
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "contact_list_members_update_member" on public.contact_list_members
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "contact_list_members_delete_member" on public.contact_list_members
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "blacklist_select_member" on public.blacklist
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "blacklist_insert_member" on public.blacklist
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "blacklist_update_member" on public.blacklist
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "blacklist_delete_member" on public.blacklist
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "brand_kits_select_member" on public.brand_kits
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "brand_kits_insert_member" on public.brand_kits
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "brand_kits_update_member" on public.brand_kits
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "brand_kits_delete_member" on public.brand_kits
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "creatives_select_member" on public.creatives
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "creatives_insert_member" on public.creatives
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "creatives_delete_member" on public.creatives
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "campaigns_select_member" on public.campaigns
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "campaigns_insert_member" on public.campaigns
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "campaigns_update_member" on public.campaigns
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "campaigns_delete_member" on public.campaigns
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "campaign_accounts_select_member" on public.campaign_accounts
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "campaign_accounts_insert_member" on public.campaign_accounts
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "campaign_accounts_delete_member" on public.campaign_accounts
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "jobs_select_member" on public.jobs
  for select to authenticated
  using (
    org_id is not null
    and public.is_org_member(org_id)
  );
create policy "jobs_insert_member" on public.jobs
  for insert to authenticated
  with check (
    org_id is not null
    and public.is_org_member(org_id)
    and created_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 10) Grants
-- ---------------------------------------------------------------------------
grant select on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;

grant select, delete on public.organization_members to authenticated;

grant update (full_name, company, onboarding_step, onboarded_at, active_org_id)
  on public.profiles to authenticated;

-- contacts update: created_by degil org_id/phone...
revoke update on public.contacts from authenticated;
grant update (phone_e164, name, extra, source) on public.contacts to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant execute on all functions in schema public to service_role;

-- ========== 20260904170000_jobs_contacts_scrape.sql ==========
-- jobs.type CHECK: contacts.scrape eklenir (web kişi tarayıcı job'ı).

alter table public.jobs drop constraint if exists jobs_type_check;

alter table public.jobs
  add constraint jobs_type_check check (type in (
    'account.connect',
    'account.disconnect',
    'account.logout',
    'account.request_pairing_code',
    'message.send',
    'contacts.verify',
    'contacts.scrape',
    'creative.render',
    'campaign.start',
    'campaign.pause',
    'campaign.resume',
    'campaign.stop'
  ));

-- ========== 20260904180000_jobs_contacts_discover.sql ==========
-- contacts.discover: yerel isletme arama (or. Bursa kuaför)
alter table public.jobs drop constraint if exists jobs_type_check;

alter table public.jobs
  add constraint jobs_type_check check (type in (
    'account.connect',
    'account.disconnect',
    'account.logout',
    'account.request_pairing_code',
    'message.send',
    'contacts.verify',
    'contacts.scrape',
    'contacts.discover',
    'creative.render',
    'campaign.start',
    'campaign.pause',
    'campaign.resume',
    'campaign.stop'
  ));

-- ========== 20260904110000_worker_hardening.sql ==========
-- VT + worker sertlestirme: sequence grant, stale job reclaim, atomik target claim,
-- hot-path indexler, authenticated INSERT sertlestirme, junction owner check.

-- ---------------------------------------------------------------------------
-- 1) Panel jobs INSERT icin sequence USAGE
-- ---------------------------------------------------------------------------
grant usage, select on sequence public.jobs_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Stuck job reclaim (worker crash / degisen WORKER_ID)
-- ---------------------------------------------------------------------------
create index if not exists jobs_stale_claimed_idx
  on public.jobs (claimed_at)
  where status in ('claimed', 'running');

create or replace function wa.reclaim_stale_jobs(p_stale_seconds int default 300)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n int;
begin
  if p_stale_seconds < 30 then
    p_stale_seconds := 30;
  end if;

  update public.jobs
     set status = 'pending',
         claimed_by = null,
         claimed_at = null,
         run_after = now(),
         error = coalesce(error, 'stale reclaim'),
         updated_at = now()
   where status in ('claimed', 'running')
     and claimed_at is not null
     and claimed_at < now() - make_interval(secs => p_stale_seconds);

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function wa.reclaim_stale_jobs(int) from public, anon, authenticated;
grant execute on function wa.reclaim_stale_jobs(int) to service_role;

-- Cron: her dakika stale job geri al
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'wa-reclaim-stale-jobs') then
      perform cron.unschedule((select jobid from cron.job where jobname = 'wa-reclaim-stale-jobs' limit 1));
    end if;

    perform cron.schedule(
      'wa-reclaim-stale-jobs',
      '* * * * *',
      'select wa.reclaim_stale_jobs(300)'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron reclaim schedule skipped: %', sqlerrm;
end;
$cron$;

-- ---------------------------------------------------------------------------
-- 3) Atomik kampanya hedef claim (multi-worker cift mesaj engeli)
-- ---------------------------------------------------------------------------
create or replace function wa.claim_campaign_target(
  p_campaign_id uuid,
  p_account_id uuid
)
returns table (
  id bigint,
  phone_e164 text,
  contact_id uuid,
  contact_name text,
  wa_status text,
  wa_jid text
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select t.id
      from public.campaign_targets t
     where t.campaign_id = p_campaign_id
       and t.status = 'queued'
       and (t.scheduled_for is null or t.scheduled_for <= now())
     order by t.id
     limit 1
     for update skip locked
  )
  update public.campaign_targets t
     set status = 'sending',
         account_id = p_account_id,
         attempts = t.attempts + 1,
         updated_at = now()
    from candidate c
   where t.id = c.id
  returning
    t.id,
    t.phone_e164,
    t.contact_id,
    (select ct.name from public.contacts ct where ct.id = t.contact_id) as contact_name,
    (select ct.wa_status from public.contacts ct where ct.id = t.contact_id) as wa_status,
    (select ct.wa_jid from public.contacts ct where ct.id = t.contact_id) as wa_jid;
end;
$$;

revoke all on function wa.claim_campaign_target(uuid, uuid) from public, anon, authenticated;
grant execute on function wa.claim_campaign_target(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4) Hot-path index: stale sending reclaim
-- ---------------------------------------------------------------------------
create index if not exists campaign_targets_sending_stale_idx
  on public.campaign_targets (updated_at)
  where status = 'sending';

-- ---------------------------------------------------------------------------
-- 5) Authenticated INSERT sertlestirme
-- ---------------------------------------------------------------------------
create or replace function public.jobs_force_pending()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and coalesce((select auth.role()), '') = 'authenticated' then
    new.status := 'pending';
    new.claimed_by := null;
    new.claimed_at := null;
    new.finished_at := null;
    new.attempts := 0;
    new.result := null;
    new.error := null;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_force_pending on public.jobs;
create trigger jobs_force_pending
  before insert on public.jobs
  for each row execute function public.jobs_force_pending();

create or replace function public.campaigns_force_draft_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and coalesce((select auth.role()), '') = 'authenticated' then
    new.status := 'draft';
    new.started_at := null;
    new.paused_at := null;
    new.completed_at := null;
    new.stop_reason := null;
    new.sent_count := 0;
    new.failed_count := 0;
    new.skipped_count := 0;
    new.total_targets := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_force_draft_on_insert on public.campaigns;
create trigger campaigns_force_draft_on_insert
  before insert on public.campaigns
  for each row execute function public.campaigns_force_draft_on_insert();

create or replace function public.accounts_sanitize_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and coalesce((select auth.role()), '') = 'authenticated' then
    new.status := 'disconnected';
    new.status_detail := null;
    new.qr_code := null;
    new.qr_expires_at := null;
    new.pairing_code := null;
    new.pairing_expires_at := null;
    new.phone_e164 := null;
    new.wa_jid := null;
    new.wa_lid := null;
    new.connected_at := null;
    new.is_locked := false;
    new.lock_reason := null;
    new.locked_at := null;
    new.sent_today := 0;
    new.sent_today_on := null;
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_sanitize_insert on public.accounts;
create trigger accounts_sanitize_insert
  before insert on public.accounts
  for each row execute function public.accounts_sanitize_insert();

-- ---------------------------------------------------------------------------
-- 6) Junction owner tutarliligi
-- ---------------------------------------------------------------------------
create or replace function public.enforce_campaign_account_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.campaigns c
     where c.id = new.campaign_id and c.owner_id = new.owner_id
  ) then
    raise exception 'campaign_accounts: campaign owner mismatch';
  end if;

  if not exists (
    select 1 from public.accounts a
     where a.id = new.account_id and a.owner_id = new.owner_id
  ) then
    raise exception 'campaign_accounts: account owner mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_campaign_account_owner on public.campaign_accounts;
create trigger enforce_campaign_account_owner
  before insert or update on public.campaign_accounts
  for each row execute function public.enforce_campaign_account_owner();

create or replace function public.enforce_list_member_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.contact_lists l
     where l.id = new.list_id and l.owner_id = new.owner_id
  ) then
    raise exception 'contact_list_members: list owner mismatch';
  end if;

  if not exists (
    select 1 from public.contacts c
     where c.id = new.contact_id and c.owner_id = new.owner_id
  ) then
    raise exception 'contact_list_members: contact owner mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_list_member_owner on public.contact_list_members;
create trigger enforce_list_member_owner
  before insert or update on public.contact_list_members
  for each row execute function public.enforce_list_member_owner();

-- failed job retention: cleanup_expired genislet
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
     and coalesce(finished_at, updated_at) < now() - interval '7 days';

  delete from public.account_events where created_at < now() - interval '30 days';
end;
$$;

revoke all on function wa.cleanup_expired() from public, anon, authenticated;
grant execute on function wa.cleanup_expired() to service_role;

-- ========== 20260904220000_jobs_contacts_check_phone.sql ==========
-- Tek numara WhatsApp kontrolu (panel anlik ✓ / ×).
alter table public.jobs drop constraint if exists jobs_type_check;

alter table public.jobs
  add constraint jobs_type_check check (type in (
    'account.connect',
    'account.disconnect',
    'account.logout',
    'account.request_pairing_code',
    'message.send',
    'contacts.verify',
    'contacts.check_phone',
    'contacts.scrape',
    'contacts.discover',
    'creative.render',
    'campaign.start',
    'campaign.pause',
    'campaign.resume',
    'campaign.stop'
  ));

-- ========== 20260904200000_message_log_inbound_wa_unique.sql ==========
-- Gelen mesajlarda (account_id, wa_message_id) tekil — cift insert yarısını engeller.
create unique index if not exists message_log_inbound_wa_id_uq
  on public.message_log (account_id, wa_message_id)
  where direction = 'in' and wa_message_id is not null;

-- ========== 20260905010000_message_log_outbound_wa_idx.sql ==========
-- Receipt / outbound lookup: account_id + wa_message_id (messages.update).
create index if not exists message_log_outbound_wa_id_idx
  on public.message_log (account_id, wa_message_id)
  where direction = 'out' and wa_message_id is not null;

create index if not exists campaign_targets_wa_message_id_idx
  on public.campaign_targets (account_id, wa_message_id)
  where wa_message_id is not null;

-- ========== 20260905130000_claim_jobs_worker_affinity.sql ==========
-- Coklu worker: account_id'li isler yalnizca kira sahibi (veya kirasiz connect*) tarafindan claim edilir.
create or replace function wa.claim_jobs(
  p_worker_id text,
  p_limit int default 10
)
returns setof public.jobs
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select j.id
      from public.jobs j
      left join wa.session_lease sl on sl.account_id = j.account_id
     where j.status = 'pending'
       and j.run_after <= now()
       and (
         -- Org / hesabi olmayan isler: herhangi bir worker.
         j.account_id is null
         -- Bu worker hesabi tutuyor.
         or (
           sl.holder_id = p_worker_id
           and sl.expires_at > now()
         )
         -- Kira yok / dolmus: yalnizca oturum acma-kapama isleri (kira buradan alinir).
         or (
           (sl.account_id is null or sl.expires_at <= now())
           and j.type in (
             'account.connect',
             'account.disconnect',
             'account.logout',
             'account.request_pairing_code'
           )
         )
       )
     order by j.priority, j.run_after, j.id
     limit greatest(p_limit, 1)
     for update of j skip locked
  )
  update public.jobs j
     set status = 'claimed',
         claimed_by = p_worker_id,
         claimed_at = now(),
         attempts = j.attempts + 1,
         updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

revoke all on function wa.claim_jobs(text, int) from public, anon, authenticated;
grant execute on function wa.claim_jobs(text, int) to service_role;

comment on function wa.claim_jobs(text, int) is
  'Pending job claim. account_id doluysa lease holder affinity; kirasiz yalnizca account.* baglanti isleri.';

-- ========== 20260905140000_worker_scaler.sql ==========
-- Autoscaler kontrol duzlemi: worker heartbeat + desired replica.

create table if not exists wa.worker_heartbeat (
  worker_id text primary key,
  max_sessions int not null default 50 check (max_sessions > 0),
  tracked int not null default 0 check (tracked >= 0),
  live int not null default 0 check (live >= 0),
  db_pool_max int not null default 2 check (db_pool_max > 0),
  seen_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

comment on table wa.worker_heartbeat is
  'Her wa-service worker periyodik upsert; scaler alive sayisi icin.';

create table if not exists wa.scaler_state (
  id int primary key default 1 check (id = 1),
  desired_workers int not null default 1 check (desired_workers >= 0),
  demand int not null default 0 check (demand >= 0),
  alive_workers int not null default 0 check (alive_workers >= 0),
  capacity_per_worker int not null default 50 check (capacity_per_worker > 0),
  reason text,
  updated_at timestamptz not null default now()
);

comment on table wa.scaler_state is
  'Tek satir: hedef worker sayisi. Actuator (docker/webhook) bunu okur.';

insert into wa.scaler_state (id, desired_workers, demand, alive_workers, reason)
values (1, 1, 0, 0, 'init')
on conflict (id) do nothing;

alter table wa.worker_heartbeat enable row level security;
alter table wa.scaler_state enable row level security;

revoke all on table wa.worker_heartbeat from public, anon, authenticated;
revoke all on table wa.scaler_state from public, anon, authenticated;
grant all on table wa.worker_heartbeat to service_role;
grant all on table wa.scaler_state to service_role;

-- ========== 20260905150000_jobs_cancel_admin_org.sql ==========
-- Members can cancel pending/claimed jobs; platform admin can update org plan/quotas.

create policy "jobs_cancel_member" on public.jobs
  for update to authenticated
  using (
    public.is_org_member(org_id)
    and status in ('pending', 'claimed')
  )
  with check (
    public.is_org_member(org_id)
    and status = 'cancelled'
  );

grant update (status, error, updated_at, finished_at) on table public.jobs to authenticated;

create or replace function public.admin_update_organization(
  p_org_id uuid,
  p_plan text default null,
  p_accounts_quota int default null,
  p_monthly_message_quota int default null
)
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

  if p_plan is not null and p_plan not in ('free', 'starter', 'pro', 'enterprise') then
    raise exception 'invalid plan';
  end if;

  update public.organizations o
     set plan = coalesce(p_plan, o.plan),
         accounts_quota = coalesce(p_accounts_quota, o.accounts_quota),
         monthly_message_quota = coalesce(p_monthly_message_quota, o.monthly_message_quota),
         updated_at = now()
   where o.id = p_org_id
   returning * into v_row;

  if not found then
    raise exception 'organization not found';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'plan', v_row.plan,
    'accounts_quota', v_row.accounts_quota,
    'monthly_message_quota', v_row.monthly_message_quota
  );
end;
$$;

revoke all on function public.admin_update_organization(uuid, text, int, int) from public;
grant execute on function public.admin_update_organization(uuid, text, int, int) to authenticated;

