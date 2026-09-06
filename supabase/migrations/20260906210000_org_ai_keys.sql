-- Org-level AI provider keys (OpenAI / Gemini / Cloudflare).
-- Env keys remain platform fallback; org keys override when set.

create table if not exists public.org_ai_keys (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  openai_api_key text,
  gemini_api_key text,
  cloudflare_account_id text,
  cloudflare_api_token text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.org_ai_keys is
  'İşletme yapay zeka anahtarları. Üye okuyabilir (sunucu tarafı); yalnızca admin yazar.';

create trigger org_ai_keys_set_updated_at
  before update on public.org_ai_keys
  for each row execute function public.set_updated_at();

alter table public.org_ai_keys enable row level security;

drop policy if exists "org_ai_keys_select_member" on public.org_ai_keys;
create policy "org_ai_keys_select_member" on public.org_ai_keys
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists "org_ai_keys_write_admin" on public.org_ai_keys;
create policy "org_ai_keys_write_admin" on public.org_ai_keys
  for insert to authenticated
  with check (public.is_org_admin(org_id));

drop policy if exists "org_ai_keys_update_admin" on public.org_ai_keys;
create policy "org_ai_keys_update_admin" on public.org_ai_keys
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

drop policy if exists "org_ai_keys_delete_admin" on public.org_ai_keys;
create policy "org_ai_keys_delete_admin" on public.org_ai_keys
  for delete to authenticated
  using (public.is_org_admin(org_id));

grant select on public.org_ai_keys to authenticated;
grant insert, update, delete on public.org_ai_keys to authenticated;
grant all on public.org_ai_keys to service_role;
