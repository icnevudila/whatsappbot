-- Çevremdekiler talebine 1–5 km yarıçap.

alter table public.list_requests
  add column if not exists radius_km smallint;

comment on column public.list_requests.radius_km is
  'Çevremdekiler talebinde arama yarıçapı (1-5 km). İl-ilçe taleplerinde null.';

update public.list_requests
   set radius_km = 2
 where kind = 'nearby'
   and radius_km is null;

alter table public.list_requests
  drop constraint if exists list_requests_kind_payload;

alter table public.list_requests
  add constraint list_requests_kind_payload check (
    (
      kind = 'province_district'
      and char_length(btrim(coalesce(category, ''))) between 2 and 160
      and jsonb_array_length(locations) between 1 and 100
      and radius_km is null
    )
    or (
      kind = 'nearby'
      and char_length(btrim(coalesce(address, ''))) between 8 and 1000
      and jsonb_array_length(locations) = 0
      and radius_km between 1 and 5
    )
  );
