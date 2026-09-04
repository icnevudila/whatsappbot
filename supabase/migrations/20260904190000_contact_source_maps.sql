-- Yerel Maps/Places keşfinden gelen listeler için source = maps
alter table public.contact_lists
  drop constraint if exists contact_lists_source_check;

alter table public.contact_lists
  add constraint contact_lists_source_check
  check (source in ('manual', 'csv', 'xlsx', 'scraper', 'api', 'quick_send', 'maps'));

alter table public.contacts
  drop constraint if exists contacts_source_check;

alter table public.contacts
  add constraint contacts_source_check
  check (source in ('manual', 'csv', 'xlsx', 'scraper', 'api', 'maps'));
