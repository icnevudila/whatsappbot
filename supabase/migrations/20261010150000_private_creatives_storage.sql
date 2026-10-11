-- Enforce Private Media Delivery for creatives bucket
-- 1. Privatize bucket: raw /storage/v1/object/public/creatives/... requests are rejected fail-closed.
update storage.buckets
   set public = false
 where id = 'creatives';

-- 2. Drop public read policy that allowed unauthenticated public access
drop policy if exists "creatives_select_public" on storage.objects;

-- 3. Re-assert strict tenant membership check on creatives storage objects
drop policy if exists "creatives_select_member" on storage.objects;
create policy "creatives_select_member" on storage.objects
  for select to authenticated
  using (bucket_id = 'creatives' and public.storage_path_allowed(name));
