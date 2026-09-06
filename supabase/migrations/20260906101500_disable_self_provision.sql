-- Self-signup / self-org kapatma:
-- 1) Yeni auth kullanicisi yalnizca profil alir (otomatik isletme yok).
-- 2) create_organization authenticated'dan kaldirilir (yalnizca service_role).

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

  -- Isletme ve uyelik yalnizca yonetici / VT tarafindan acilir.
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.create_organization(text) from public, anon, authenticated;
grant execute on function public.create_organization(text) to service_role;

comment on function public.handle_new_user() is
  'Auth kullanicisi icin profil olusturur. Isletme otomatik acilmaz.';

comment on function public.create_organization(text) is
  'Yalnizca service_role: panel self-provision kapali.';
