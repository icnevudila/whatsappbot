-- Gelen WhatsApp görselleri için public bucket.
-- Yol: {org_id}/inbound/{account_id}/{wa_message_id}.{ext}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  true,
  15728640, -- 15 MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'audio/ogg',
    'audio/mpeg',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

drop policy if exists "chat_media_select_member" on storage.objects;
drop policy if exists "chat_media_insert_member" on storage.objects;
drop policy if exists "chat_media_delete_member" on storage.objects;

-- Public bucket: okuma URL ile serbest; panel üyeleri kendi org yolunu yönetebilir.
create policy "chat_media_select_member" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-media' and public.storage_path_allowed(name));

create policy "chat_media_insert_member" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-media' and public.storage_path_allowed(name));

create policy "chat_media_delete_member" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-media' and public.storage_path_allowed(name));
