-- Org üyeleri, aynı işletmedeki diğer üyelerin temel profil alanlarını (ad, e-posta) görebilir.
-- Ayarlar > Ekip listesinde e-postaların null görünmesini düzeltir.

drop policy if exists "profiles_select_org_peers" on public.profiles;
create policy "profiles_select_org_peers" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.organization_members me
      join public.organization_members peer on peer.org_id = me.org_id
      where me.user_id = (select auth.uid())
        and peer.user_id = profiles.id
    )
  );
