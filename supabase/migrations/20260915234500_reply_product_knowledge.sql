-- Mesaj ve gorsellerden ogrenilen urun/fiyat/kampanya bilgisi.
-- Onerilen cevap ve oto-cevap once bu hafizayi baglama ekler.

create table if not exists public.reply_product_knowledge (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  source_message_id bigint references public.message_log (id) on delete set null,
  source text not null default 'message'
    check (source in ('message', 'image', 'campaign', 'manual')),
  phone_e164 text,
  product_name text,
  price_amount numeric(12, 2),
  currency text,
  raw_text text,
  source_media_url text,
  attributes jsonb not null default '{}'::jsonb,
  confidence numeric(4, 3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reply_product_knowledge_source_unique
  on public.reply_product_knowledge (org_id, source_message_id, coalesce(product_name, ''), coalesce(price_amount, -1), coalesce(currency, ''))
  where source_message_id is not null;

create index if not exists reply_product_knowledge_org_recent_idx
  on public.reply_product_knowledge (org_id, last_seen_at desc, created_at desc);

create index if not exists reply_product_knowledge_org_product_idx
  on public.reply_product_knowledge (org_id, lower(product_name))
  where product_name is not null;

alter table public.reply_product_knowledge enable row level security;

drop policy if exists "reply_product_knowledge_select_member" on public.reply_product_knowledge;
create policy "reply_product_knowledge_select_member" on public.reply_product_knowledge
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists "reply_product_knowledge_insert_member" on public.reply_product_knowledge;
create policy "reply_product_knowledge_insert_member" on public.reply_product_knowledge
  for insert to authenticated
  with check (public.is_org_member(org_id));

drop policy if exists "reply_product_knowledge_update_member" on public.reply_product_knowledge;
create policy "reply_product_knowledge_update_member" on public.reply_product_knowledge
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

grant select, insert on public.reply_product_knowledge to authenticated;
grant update (product_name, price_amount, currency, raw_text, source_media_url, attributes, confidence, last_seen_at, updated_at)
  on public.reply_product_knowledge to authenticated;
grant all on public.reply_product_knowledge to service_role;
