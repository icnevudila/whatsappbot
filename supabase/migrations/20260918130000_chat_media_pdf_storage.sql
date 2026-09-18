-- chat-media ve creatives bucket'larina PDF ve katalog gibi buyuk dosyalarin
-- yuklenebilmesi icin boyut limiti 30 MB'a cikarildi ve RLS yolu genisletildi.

update storage.buckets
set file_size_limit = 31457280
where id in ('chat-media', 'creatives');

create or replace function public.storage_path_allowed(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when (select auth.uid()) is not null and (storage.foldername(p_name))[1] in ('chat', 'uploads', (select auth.uid())::text) then true
      when (storage.foldername(p_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_org_member((storage.foldername(p_name))[1]::uuid)
      else false
    end;
$$;
