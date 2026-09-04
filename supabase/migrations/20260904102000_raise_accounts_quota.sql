-- Pilot: tek hat kotasi gelistirmeyi kilitliyordu. Varsayilan 40 hat.
-- Odeme entegrasyonu gelince paket tablosundan yazilacak.

alter table public.profiles
  alter column accounts_quota set default 40;

update public.profiles
   set accounts_quota = greatest(accounts_quota, 40),
       plan = case when plan = 'free' then 'pro' else plan end,
       monthly_message_quota = greatest(monthly_message_quota, 100000);

comment on column public.profiles.accounts_quota is
  'Kullanicinin acabilecegi WhatsApp hat sayisi. Varsayilan 40 (pilot); odeme entegrasyonu gelince pakete baglanir.';
