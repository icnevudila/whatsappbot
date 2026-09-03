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
