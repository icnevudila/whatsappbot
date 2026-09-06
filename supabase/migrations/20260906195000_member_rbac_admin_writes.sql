-- member RBAC: marka kiti yazma + hesap silme yalnız admin/owner

drop policy if exists "brand_kits_insert_member" on public.brand_kits;
drop policy if exists "brand_kits_update_member" on public.brand_kits;
drop policy if exists "brand_kits_delete_member" on public.brand_kits;

create policy "brand_kits_insert_admin" on public.brand_kits
  for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy "brand_kits_update_admin" on public.brand_kits
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy "brand_kits_delete_admin" on public.brand_kits
  for delete to authenticated
  using (public.is_org_admin(org_id));

-- Hesap silme: admin; bağlama/güncelleme üye kalır
drop policy if exists "accounts_delete_member" on public.accounts;
create policy "accounts_delete_admin" on public.accounts
  for delete to authenticated
  using (public.is_org_admin(org_id));
