-- Hat Isindirma (Warm-Up) Koruma Ayari
alter table public.organizations
  add column if not exists warmup_enabled boolean not null default true;

comment on column public.organizations.warmup_enabled is
  'true iken organizasyona bagli yeni hatlarda ilk 14 gun kademeli gonderim limiti (warmupCap) uygulanir. False yapildiginda hatlar tam limitinde calisir.';

grant select, update (warmup_enabled) on public.organizations to authenticated;
