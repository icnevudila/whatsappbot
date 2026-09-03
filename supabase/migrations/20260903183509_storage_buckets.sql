-- Storage bucket'lari ve erisim politikalari.
--
-- Yol sozlesmesi her bucket'ta ayni: <auth.uid()>/<...>
-- Ilk klasor kullanicinin id'si; politikalar bunun uzerinden calisiyor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'brand-assets',
    'brand-assets',
    false,
    5242880, -- 5 MB
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'font/woff2', 'font/ttf']
  ),
  (
    -- Public: Baileys'e gonderim sirasinda kalici bir URL vermemiz gerekiyor.
    -- mediaCache anahtari "tip + URL" oldugu icin imzali URL her uretimde
    -- degisir ve onbellek hep isabetsiz kalir; o zaman 500 alici = 500 upload.
    'creatives',
    'creatives',
    true,
    10485760, -- 10 MB
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'imports',
    'imports',
    false,
    20971520, -- 20 MB
    array[
      'text/csv',
      'text/plain',
      'application/json',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- brand-assets: ozel. Sahibi okur/yazar, servis imzali URL uretir.
-- Upsert icin INSERT + SELECT + UPDATE ucu birlikte gerekiyor; yalnizca
-- INSERT verilirse dosya degistirme sessizce basarisiz olur.
-- ---------------------------------------------------------------------------
create policy "brand_assets_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "brand_assets_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "brand_assets_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "brand_assets_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- creatives: bucket public oldugu icin okuma zaten serbest.
-- Yazma yine sahibine kisitli. Her render yeni yol aldigi icin UPDATE yok.
-- ---------------------------------------------------------------------------
create policy "creatives_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'creatives'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "creatives_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'creatives'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "creatives_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'creatives'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- imports: CSV/XLSX yuklemeleri, ice aktarma sonrasi silinebilir
-- ---------------------------------------------------------------------------
create policy "imports_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "imports_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "imports_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "imports_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
