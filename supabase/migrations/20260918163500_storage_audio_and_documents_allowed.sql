-- chat-media ve creatives bucket'larina ses dosyalari, sesli mesajlar (PTT),
-- ofis dokumanlari ve diger belge tiplerinin sorunsuz yuklenebilmesi icin
-- allowed_mime_types genisletildi ve creatives public SELECT policy eklendi.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/webm',
  'audio/opus',
  'audio/aac',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv',
  'application/octet-stream'
]
where id in ('chat-media', 'creatives');

drop policy if exists "creatives_select_public" on storage.objects;
create policy "creatives_select_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'creatives');
