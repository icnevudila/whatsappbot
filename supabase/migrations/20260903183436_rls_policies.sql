-- RLS: public semasindaki her tablo acik, her politika sahiplik yordamiyla.
--
-- Iki kural her yerde gecerli:
--   1) "TO authenticated" tek basina yetkilendirme degil, sadece kimlik dogrulama.
--      Satir kisitlamasi USING icindeki owner_id esitligiyle yapilir.
--   2) UPDATE politikalari hem USING hem WITH CHECK icerir. WITH CHECK olmadan
--      kullanici satirin owner_id'sini baskasina cevirebilir.
--
-- auth.uid() cagrisi (select auth.uid()) icine alinir: Postgres bunu InitPlan
-- olarak bir kez degerlendirir, satir basina yeniden cagirmaz.

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_events enable row level security;
alter table public.contact_lists enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_list_members enable row level security;
alter table public.blacklist enable row level security;
alter table public.brand_kits enable row level security;
alter table public.creatives enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_accounts enable row level security;
alter table public.campaign_targets enable row level security;
alter table public.message_log enable row level security;
alter table public.jobs enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: kendi profilini gorur ve gunceller, satir trigger ile olusur
-- ---------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- accounts: panel olusturur/siler, durum kolonlarini servis yazar
-- (hangi kolonlarin yazilabilecegi GRANT migrasyonunda kolon bazli veriliyor)
-- ---------------------------------------------------------------------------
create policy "accounts_select_own" on public.accounts
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "accounts_insert_own" on public.accounts
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "accounts_update_own" on public.accounts
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "accounts_delete_own" on public.accounts
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Yalnizca okunan akislar: servis yazar, panel izler
-- ---------------------------------------------------------------------------
create policy "account_events_select_own" on public.account_events
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "campaign_targets_select_own" on public.campaign_targets
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "message_log_select_own" on public.message_log
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- contact_lists
-- ---------------------------------------------------------------------------
create policy "contact_lists_select_own" on public.contact_lists
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "contact_lists_insert_own" on public.contact_lists
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "contact_lists_update_own" on public.contact_lists
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "contact_lists_delete_own" on public.contact_lists
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create policy "contacts_select_own" on public.contacts
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "contacts_insert_own" on public.contacts
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "contacts_update_own" on public.contacts
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "contacts_delete_own" on public.contacts
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- contact_list_members
-- ---------------------------------------------------------------------------
create policy "contact_list_members_select_own" on public.contact_list_members
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "contact_list_members_insert_own" on public.contact_list_members
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "contact_list_members_update_own" on public.contact_list_members
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "contact_list_members_delete_own" on public.contact_list_members
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- blacklist
-- ---------------------------------------------------------------------------
create policy "blacklist_select_own" on public.blacklist
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "blacklist_insert_own" on public.blacklist
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "blacklist_update_own" on public.blacklist
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "blacklist_delete_own" on public.blacklist
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- brand_kits
-- ---------------------------------------------------------------------------
create policy "brand_kits_select_own" on public.brand_kits
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "brand_kits_insert_own" on public.brand_kits
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "brand_kits_update_own" on public.brand_kits
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "brand_kits_delete_own" on public.brand_kits
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- creatives: panel render talebi olusturur, sonucu servis yazar
-- ---------------------------------------------------------------------------
create policy "creatives_select_own" on public.creatives
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "creatives_insert_own" on public.creatives
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "creatives_delete_own" on public.creatives
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create policy "campaigns_select_own" on public.campaigns
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "campaigns_insert_own" on public.campaigns
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "campaigns_update_own" on public.campaigns
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "campaigns_delete_own" on public.campaigns
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- campaign_accounts
-- ---------------------------------------------------------------------------
create policy "campaign_accounts_select_own" on public.campaign_accounts
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "campaign_accounts_insert_own" on public.campaign_accounts
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "campaign_accounts_delete_own" on public.campaign_accounts
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- jobs: panel komut yazar ve sonucunu izler; durumu degistiremez
-- (UPDATE ve DELETE hakki GRANT migrasyonunda hic verilmiyor)
-- ---------------------------------------------------------------------------
create policy "jobs_select_own" on public.jobs
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "jobs_insert_own" on public.jobs
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
