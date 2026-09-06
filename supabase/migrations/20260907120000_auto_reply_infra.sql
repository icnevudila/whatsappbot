-- Otomatik yanit: altyapi hazir, varsayilan kapali.
alter table public.organizations
  add column if not exists auto_reply_enabled boolean not null default false;

comment on column public.organizations.auto_reply_enabled is
  'true iken worker inbound mesajlarda auto_reply_rules uygular. Varsayilan false; platform acar.';

create table if not exists public.auto_reply_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rule_id uuid not null references public.auto_reply_rules (id) on delete cascade,
  phone_e164 text not null,
  account_id uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists auto_reply_log_cooldown_idx
  on public.auto_reply_log (org_id, rule_id, phone_e164, created_at desc);

alter table public.auto_reply_log enable row level security;

drop policy if exists "auto_reply_log_select_member" on public.auto_reply_log;
create policy "auto_reply_log_select_member" on public.auto_reply_log
  for select to authenticated
  using (public.is_org_member(org_id));

grant select on public.auto_reply_log to authenticated;
grant all on public.auto_reply_log to service_role;
