create table if not exists public.org_api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  name text not null default 'default',
  key_prefix text not null,
  key_hash text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists org_api_keys_prefix_idx
  on public.org_api_keys (key_prefix) where revoked_at is null;

alter table public.org_api_keys enable row level security;

drop policy if exists "org_api_keys_admin" on public.org_api_keys;
create policy "org_api_keys_admin" on public.org_api_keys
  for all to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

grant select, insert, update, delete on public.org_api_keys to authenticated;
grant all on public.org_api_keys to service_role;

create or replace function public.resolve_org_api_key(p_key text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_prefix text;
  v_hash text;
begin
  if p_key is null or length(p_key) < 16 then
    return null;
  end if;
  v_prefix := left(p_key, 8);
  v_hash := encode(digest(p_key, 'sha256'), 'hex');
  select org_id into v_org
    from public.org_api_keys
   where key_prefix = v_prefix
     and key_hash = v_hash
     and revoked_at is null
   limit 1;
  if v_org is not null then
    update public.org_api_keys
       set last_used_at = now()
     where key_prefix = v_prefix and key_hash = v_hash and revoked_at is null;
  end if;
  return v_org;
end;
$$;

revoke all on function public.resolve_org_api_key(text) from public;
grant execute on function public.resolve_org_api_key(text) to service_role;
