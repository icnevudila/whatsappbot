-- JWT yoksa bile profiles.is_platform_admin ile admin RPC açılsın
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_admin') in ('true', '1'), false)
    or exists (
      select 1
        from public.profiles p
       where p.id = auth.uid()
         and p.is_platform_admin is true
    );
$$;
