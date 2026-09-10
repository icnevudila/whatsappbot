-- Katalog: ürünler, görseller, sosyal hesaplar.

create table public.org_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  name text not null,
  description text,
  box_contents text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_products_name_len check (char_length(btrim(name)) between 1 and 160)
);

comment on table public.org_products is 'İşletme ürün kataloğu (müşteri paneli Ayarlar → Ürünlerim).';
comment on column public.org_products.box_contents is 'Kutu içeriği / paket içeriği metni.';

create index org_products_org_idx on public.org_products (org_id, created_at desc);

create trigger org_products_set_updated_at
  before update on public.org_products
  for each row execute function public.set_updated_at();

create table public.org_product_images (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.org_products (id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on column public.org_product_images.storage_path is 'creatives bucket yolu: {org_id}/products/{product_id}/{uuid}.ext';

create index org_product_images_product_idx on public.org_product_images (product_id, sort_order);
create index org_product_images_org_idx on public.org_product_images (org_id);

create table public.org_social_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  platform text not null
    check (platform in (
      'instagram', 'facebook', 'tiktok', 'youtube', 'x', 'linkedin', 'website', 'other'
    )),
  label text,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_social_url_len check (char_length(btrim(url)) between 3 and 500)
);

create index org_social_accounts_org_idx on public.org_social_accounts (org_id, created_at desc);

create trigger org_social_accounts_set_updated_at
  before update on public.org_social_accounts
  for each row execute function public.set_updated_at();

alter table public.org_products enable row level security;
alter table public.org_product_images enable row level security;
alter table public.org_social_accounts enable row level security;

grant select, insert, update, delete on public.org_products to authenticated;
grant select, insert, update, delete on public.org_product_images to authenticated;
grant select, insert, update, delete on public.org_social_accounts to authenticated;

create policy "org_products_select_member" on public.org_products
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "org_products_insert_member" on public.org_products
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "org_products_update_member" on public.org_products
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "org_products_delete_member" on public.org_products
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "org_product_images_select_member" on public.org_product_images
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "org_product_images_insert_member" on public.org_product_images
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "org_product_images_update_member" on public.org_product_images
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "org_product_images_delete_member" on public.org_product_images
  for delete to authenticated
  using (public.is_org_member(org_id));

create policy "org_social_accounts_select_member" on public.org_social_accounts
  for select to authenticated
  using (public.is_org_member(org_id));
create policy "org_social_accounts_insert_member" on public.org_social_accounts
  for insert to authenticated
  with check (public.is_org_member(org_id));
create policy "org_social_accounts_update_member" on public.org_social_accounts
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
create policy "org_social_accounts_delete_member" on public.org_social_accounts
  for delete to authenticated
  using (public.is_org_member(org_id));
