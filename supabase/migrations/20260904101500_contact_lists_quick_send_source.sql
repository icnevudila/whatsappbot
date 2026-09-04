-- Hizli gonderim arka planda liste olusturur (kampanya motoru source_list_ids ister).
-- Bu listeler Kisiler / kampanya secicisinde gorunmemeli.

alter table public.contact_lists drop constraint if exists contact_lists_source_check;

alter table public.contact_lists
  add constraint contact_lists_source_check
  check (source in ('manual', 'csv', 'xlsx', 'scraper', 'api', 'quick_send'));

comment on column public.contact_lists.source is
  'manual/csv/... = kullanici listeleri (Kisiler). quick_send = hizli gonderim ara kaydi, panel listelerinde gizlenir.';

update public.contact_lists
   set source = 'quick_send'
 where source <> 'quick_send'
   and (
     name like 'Hizli gonderim%'
     or name like 'Hızlı gönderim%'
   );
