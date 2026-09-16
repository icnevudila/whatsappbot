-- İşletme SSS (sık sorulan sorular) — manuel Q&A; AI yanıtlama için kaynak.

create table if not exists public.org_faqs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  product_id uuid references public.org_products (id) on delete set null,
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_faqs_question_len check (char_length(btrim(question)) between 1 and 500),
  constraint org_faqs_answer_len check (char_length(btrim(answer)) between 1 and 4000)
);

-- Eski migration tablosu varsa ürün kolonunu ekle
alter table public.org_faqs
  add column if not exists product_id uuid references public.org_products (id) on delete set null;

comment on table public.org_faqs is
  'İşletme SSS. Manuel soru-cevap; otomatik/AI yanıtlama bağlamı için kullanılır.';
comment on column public.org_faqs.product_id is 'Opsiyonel ürün bağlantısı; ürün SSS için.';

create index if not exists org_faqs_org_idx
  on public.org_faqs (org_id, sort_order asc, created_at desc);

create index if not exists org_faqs_org_active_idx
  on public.org_faqs (org_id, sort_order asc)
  where is_active;

create index if not exists org_faqs_product_idx
  on public.org_faqs (org_id, product_id)
  where product_id is not null;

drop trigger if exists org_faqs_set_updated_at on public.org_faqs;
create trigger org_faqs_set_updated_at
  before update on public.org_faqs
  for each row execute function public.set_updated_at();

alter table public.org_faqs enable row level security;

grant select, insert, update, delete on public.org_faqs to authenticated;
grant all on public.org_faqs to service_role;

drop policy if exists "org_faqs_select_member" on public.org_faqs;
drop policy if exists "org_faqs_insert_member" on public.org_faqs;
drop policy if exists "org_faqs_update_member" on public.org_faqs;
drop policy if exists "org_faqs_delete_member" on public.org_faqs;

create policy "org_faqs_select_member" on public.org_faqs
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "org_faqs_insert_member" on public.org_faqs
  for insert to authenticated
  with check (public.is_org_member(org_id));

create policy "org_faqs_update_member" on public.org_faqs
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "org_faqs_delete_member" on public.org_faqs
  for delete to authenticated
  using (public.is_org_member(org_id));

notify pgrst, 'reload schema';
