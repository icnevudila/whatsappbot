-- Saf Postgres (Supabase auth yok) icin minimal stub.
-- Yalnizca worker-kit demetinden ONCE uygulayin.
-- Uretim Filo/Supabase kurulumunda GEREKMEZ.

create schema if not exists auth;
create schema if not exists extensions;

do $$ begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null;
end $$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- JWT stub: worker service_role ile baglanir; panel auth bu stub'da yok.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
