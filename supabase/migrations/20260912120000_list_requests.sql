-- İşletmelerin kişi listesi talepleri (il-ilçe veya çevremdekiler).
-- Şimdilik yalnız insert + listeleme; durum varsayılan pending.

create table public.list_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  kind text not null check (kind in ('province_district', 'nearby')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'rejected')),
  category text,
  address text,
  locations jsonb not null default '[]'::jsonb,
  contact_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint list_requests_contact_count_nonneg check (contact_count >= 0),
  constraint list_requests_locations_is_array check (jsonb_typeof(locations) = 'array'),
  constraint list_requests_kind_payload check (
    (
      kind = 'province_district'
      and char_length(btrim(coalesce(category, ''))) between 2 and 160
      and jsonb_array_length(locations) between 1 and 100
    )
    or (
      kind = 'nearby'
      and char_length(btrim(coalesce(address, ''))) between 8 and 1000
      and jsonb_array_length(locations) = 0
    )
  )
);

comment on table public.list_requests is
  'Müşteri paneli kişi listesi talepleri. Operasyon sonra doldurur; contact_count o zaman güncellenir.';
comment on column public.list_requests.kind is
  'province_district = il/ilçe + kategori; nearby = açık adres (çevremdekiler).';
comment on column public.list_requests.locations is
  'Seçilen il/ilçe dizisi. Örn. [{"type":"district","province_id":16,"province_name":"Bursa","district_id":1,"district_name":"Nilüfer"}]';
comment on column public.list_requests.contact_count is
  'Teslim edilen kişi sayısı. Talep açılırken 0.';

create index list_requests_org_created_idx
  on public.list_requests (org_id, created_at desc);

create trigger list_requests_set_updated_at
  before update on public.list_requests
  for each row execute function public.set_updated_at();

alter table public.list_requests enable row level security;

grant select, insert on public.list_requests to authenticated;

create policy "list_requests_select_member" on public.list_requests
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "list_requests_insert_member" on public.list_requests
  for insert to authenticated
  with check (public.is_org_member(org_id));
