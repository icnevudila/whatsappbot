-- İl-ilçe taleplerinde Türkiye geneli seçeneği.

alter table public.list_requests
  add column if not exists nationwide boolean not null default false;

comment on column public.list_requests.nationwide is
  'true ise il/ilçe seçilmez; kategori tüm Türkiye için istenir.';

alter table public.list_requests
  drop constraint if exists list_requests_kind_payload;

alter table public.list_requests
  add constraint list_requests_kind_payload check (
    (
      kind = 'province_district'
      and char_length(btrim(coalesce(category, ''))) between 2 and 160
      and radius_km is null
      and (
        (nationwide = true and jsonb_array_length(locations) = 0)
        or (nationwide = false and jsonb_array_length(locations) between 1 and 100)
      )
    )
    or (
      kind = 'nearby'
      and nationwide = false
      and char_length(btrim(coalesce(address, ''))) between 8 and 1000
      and jsonb_array_length(locations) = 0
      and radius_km between 1 and 5
    )
  );
