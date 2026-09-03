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
