-- Müşteri onboarding: işletme adres/telefon/tanıtım + ilk org açma RPC.
-- Mevcut create_organization grant'ına dokunulmaz (panel self-provision kapalı kalır).

alter table public.organizations
  add column if not exists address text,
  add column if not exists about text,
  add column if not exists phone_e164 text,
  add column if not exists onboarding jsonb not null default '{}'::jsonb;

comment on column public.organizations.address is 'Açık işletme adresi (müşteri onboarding).';
comment on column public.organizations.about is 'Kısa işletme tanıtımı (müşteri onboarding).';
comment on column public.organizations.phone_e164 is 'Onboardingde girilen tek WhatsApp hattı (E.164).';
comment on column public.organizations.onboarding is 'Müşteri onboarding ilerleme bayrakları (brand_analyzed, skipped_contacts, …).';

alter table public.organizations
  drop constraint if exists organizations_phone_e164_format;

alter table public.organizations
  add constraint organizations_phone_e164_format
  check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

grant update (address, about, phone_e164, onboarding) on public.organizations to authenticated;

create or replace function public.onboard_create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select m.org_id into v_existing
    from public.organization_members m
   where m.user_id = v_uid
   order by m.created_at asc
   limit 1;

  if v_existing is not null then
    update public.profiles
       set active_org_id = v_existing
     where id = v_uid
       and (active_org_id is distinct from v_existing);
    return v_existing;
  end if;

  return public.create_organization(p_name);
end;
$$;

revoke all on function public.onboard_create_organization(text) from public, anon;
grant execute on function public.onboard_create_organization(text) to authenticated, service_role;

comment on function public.onboard_create_organization(text) is
  'Müşteri onboarding: üyelik yoksa create_organization çağırır; varsa mevcut org_id döner. Panel self-provision grant’ını değiştirmez.';
