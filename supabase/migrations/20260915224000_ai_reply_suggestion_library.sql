-- AI onerilen cevap kutuphanesi.
-- Panel once ayni normalize mesaj icin buradan okur; yoksa gateway'e gider ve sonucu kaydeder.

create table if not exists public.ai_reply_suggestion_library (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  message_fingerprint text not null,
  context_fingerprint text not null default '',
  incoming_sample text not null,
  suggestions jsonb not null,
  source text not null default 'chatgpt',
  hit_count integer not null default 0,
  generated_count integer not null default 1,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_reply_suggestion_library_suggestions_array
    check (jsonb_typeof(suggestions) = 'array'),
  constraint ai_reply_suggestion_library_source_check
    check (source in ('chatgpt', 'manual', 'import'))
);

create unique index if not exists ai_reply_suggestion_library_lookup_key
  on public.ai_reply_suggestion_library (org_id, message_fingerprint, context_fingerprint);

create index if not exists ai_reply_suggestion_library_recent_idx
  on public.ai_reply_suggestion_library (org_id, last_used_at desc nulls last, updated_at desc);

alter table public.ai_reply_suggestion_library enable row level security;

drop policy if exists "ai_reply_suggestion_library_select_member" on public.ai_reply_suggestion_library;
create policy "ai_reply_suggestion_library_select_member" on public.ai_reply_suggestion_library
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists "ai_reply_suggestion_library_insert_member" on public.ai_reply_suggestion_library;
create policy "ai_reply_suggestion_library_insert_member" on public.ai_reply_suggestion_library
  for insert to authenticated
  with check (public.is_org_member(org_id));

drop policy if exists "ai_reply_suggestion_library_update_member" on public.ai_reply_suggestion_library;
create policy "ai_reply_suggestion_library_update_member" on public.ai_reply_suggestion_library
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

grant select, insert on public.ai_reply_suggestion_library to authenticated;
grant update (suggestions, hit_count, generated_count, last_used_at, incoming_sample, updated_at)
  on public.ai_reply_suggestion_library to authenticated;
grant all on public.ai_reply_suggestion_library to service_role;
