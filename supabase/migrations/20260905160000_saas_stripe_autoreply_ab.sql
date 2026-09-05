-- Stripe / CRM / auto-reply / campaign A-B fields

alter table public.organizations
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists webhook_url text,
  add column if not exists webhook_secret text;

comment on column public.organizations.webhook_url is
  'CRM outbound: POST JSON events (message.inbound, campaign.completed, ...).';

create table if not exists public.auto_reply_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  name text not null default 'Kural',
  enabled boolean not null default true,
  match_mode text not null default 'contains'
    check (match_mode in ('contains', 'equals', 'regex', 'any')),
  match_pattern text not null default '',
  reply_body text not null,
  cooldown_seconds int not null default 3600 check (cooldown_seconds >= 0),
  priority int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auto_reply_rules_org_idx
  on public.auto_reply_rules (org_id) where enabled;

alter table public.auto_reply_rules enable row level security;

drop policy if exists "auto_reply_select_member" on public.auto_reply_rules;
create policy "auto_reply_select_member" on public.auto_reply_rules
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists "auto_reply_write_admin" on public.auto_reply_rules;
create policy "auto_reply_write_admin" on public.auto_reply_rules
  for all to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

grant select, insert, update, delete on public.auto_reply_rules to authenticated;

alter table public.campaigns
  add column if not exists body_b text,
  add column if not exists ab_percent int not null default 0
    check (ab_percent >= 0 and ab_percent <= 100);

comment on column public.campaigns.body_b is 'A/B: B varyanti (spintax da desteklenir).';
comment on column public.campaigns.ab_percent is 'Hedeflerin yuzde kaci body_b alir (0=kapali).';

create or replace function public.apply_stripe_subscription(
  p_org_id uuid,
  p_plan text,
  p_accounts_quota int,
  p_monthly_message_quota int,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.organizations%rowtype;
begin
  if p_plan not in ('free', 'starter', 'pro', 'enterprise') then
    raise exception 'invalid plan';
  end if;

  update public.organizations o
     set plan = p_plan,
         accounts_quota = greatest(p_accounts_quota, 0),
         monthly_message_quota = greatest(p_monthly_message_quota, 0),
         stripe_customer_id = coalesce(p_stripe_customer_id, o.stripe_customer_id),
         stripe_subscription_id = coalesce(p_stripe_subscription_id, o.stripe_subscription_id),
         updated_at = now()
   where o.id = p_org_id
   returning * into v_row;

  if not found then
    raise exception 'organization not found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.apply_stripe_subscription(uuid, text, int, int, text, text) from public;
grant execute on function public.apply_stripe_subscription(uuid, text, int, int, text, text) to service_role;
