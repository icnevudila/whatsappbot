-- İşletme bazlı aylık video üretim kotası (varsayılan 3 video).
alter table public.organizations
  add column if not exists monthly_video_quota integer not null default 3;

comment on column public.organizations.monthly_video_quota is
  'İşletmenin aylık üretebileceği yapay zeka video sayısı kotası. Admin panelinden yönetici tarafından belirlenir.';

do \$\$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_monthly_video_quota_non_negative'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations
      add constraint organizations_monthly_video_quota_non_negative
      check (monthly_video_quota >= 0);
  end if;
end \$\$;
