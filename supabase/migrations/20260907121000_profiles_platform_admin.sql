-- profiles.is_platform_admin (panel helper + PLATFORM_ADMIN_EMAILS)
alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

comment on column public.profiles.is_platform_admin is
  'Platform super admin (Filo). Client update yok; SQL veya service_role.';
