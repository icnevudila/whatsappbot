-- İşletme logosu marka kitlerinden ayrılır.
alter table public.organizations
  add column if not exists logo_path text;

comment on column public.organizations.logo_path is
  'İşletme logosu — brand-assets bucket yolu. Marka kitlerinden bağımsız.';

grant update (logo_path) on public.organizations to authenticated;

comment on column public.brand_kits.logo_path is
  'Marka kiti örnek/referans görseli (stil analizi). İşletme logosu organizations.logo_path üzerindedir.';
