-- Migration: 20261011123000_stripe_webhook_atomic_ledger.sql
-- Description: Atomic Stripe webhook processing, event idempotency ledger, and sequence protection.

-- 1. Ensure organizations table has stripe_last_event_created_at column
alter table public.organizations
  add column if not exists stripe_last_event_created_at timestamptz default null;

-- 2. Create stripe_webhook_events table for transactional idempotency & audit ledger
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  stripe_created_at timestamptz not null,
  processed_at timestamptz not null default now(),
  subscription_id text,
  status text not null, -- 'applied', 'idempotent_duplicate', 'skipped_stale'
  plan text
);

create index if not exists idx_stripe_webhook_events_org_id 
  on public.stripe_webhook_events(org_id);
create index if not exists idx_stripe_webhook_events_stripe_created 
  on public.stripe_webhook_events(stripe_created_at);

-- 3. Atomic RPC for processing Stripe webhook events with full transactional integrity
create or replace function public.apply_stripe_subscription_atomic(
  p_event_id text,
  p_event_created_at timestamptz,
  p_event_type text,
  p_org_id uuid,
  p_plan text,
  p_accounts_quota int,
  p_monthly_message_quota int,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null,
  p_status text default null,
  p_is_upgrade boolean default false,
  p_is_downgrade boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
  v_updated_org public.organizations%rowtype;
  v_existing_event public.stripe_webhook_events%rowtype;
  v_new_plan text;
  v_new_sub_id text;
  v_new_suspended_at timestamptz;
  v_new_suspend_reason text;
begin
  if p_event_id is null or trim(p_event_id) = '' then
    raise exception 'STRIPE_EVENT_ID_REQUIRED';
  end if;

  if p_plan not in ('free', 'starter', 'pro', 'enterprise') then
    raise exception 'INVALID_PLAN';
  end if;

  -- Step 1: Check if event was already processed (Idempotency)
  select * into v_existing_event
    from public.stripe_webhook_events
   where event_id = p_event_id;

  if found then
    return jsonb_build_object(
      'success', true,
      'status', 'idempotent_duplicate',
      'event_id', p_event_id,
      'org_id', p_org_id,
      'processed_at', v_existing_event.processed_at
    );
  end if;

  -- Step 2: Lock organization row for update to ensure serial execution per tenant
  select * into v_org
    from public.organizations
   where id = p_org_id
     for update;

  if not found then
    raise exception 'ORGANIZATION_NOT_FOUND';
  end if;

  -- Step 3: Out-of-order event sequence guard
  -- If this event was created earlier than an event we already processed, record but do not overwrite newer state
  if v_org.stripe_last_event_created_at is not null and p_event_created_at < v_org.stripe_last_event_created_at then
    insert into public.stripe_webhook_events (
      event_id, org_id, event_type, stripe_created_at, processed_at, subscription_id, status, plan
    ) values (
      p_event_id, p_org_id, p_event_type, p_event_created_at, now(), p_stripe_subscription_id, 'skipped_stale', p_plan
    );

    return jsonb_build_object(
      'success', true,
      'status', 'skipped_stale',
      'event_id', p_event_id,
      'org_id', p_org_id,
      'current_plan', v_org.plan,
      'last_event_created_at', v_org.stripe_last_event_created_at
    );
  end if;

  -- Step 3.5: Subscription ID mismatch guard
  -- If event is for an older/different subscription ID, do not overwrite active subscription
  if v_org.stripe_subscription_id is not null and p_stripe_subscription_id is not null and v_org.stripe_subscription_id != p_stripe_subscription_id then
    -- Guard against cancellation, failure, or late updates belonging to a superseded subscription
    if p_event_type in ('customer.subscription.deleted', 'invoice.payment_failed') or p_status in ('canceled', 'past_due', 'unpaid') or (not p_is_upgrade and p_event_type != 'checkout.session.completed') then
      insert into public.stripe_webhook_events (
        event_id, org_id, event_type, stripe_created_at, processed_at, subscription_id, status, plan
      ) values (
        p_event_id, p_org_id, p_event_type, p_event_created_at, now(), p_stripe_subscription_id, 'skipped_mismatched_subscription', p_plan
      );

      return jsonb_build_object(
        'success', true,
        'status', 'skipped_mismatched_subscription',
        'event_id', p_event_id,
        'org_id', p_org_id,
        'current_subscription_id', v_org.stripe_subscription_id,
        'event_subscription_id', p_stripe_subscription_id
      );
    end if;
  end if;

  -- Step 4: Calculate new state based on plan, status, and upgrade/downgrade flags
  -- Priority 1: Payment Delinquency (past_due, unpaid, or invoice.payment_failed) MUST SUSPEND the tenant immediately
  if p_status in ('past_due', 'unpaid') or p_event_type = 'invoice.payment_failed' then
    v_new_plan := v_org.plan;
    v_new_sub_id := coalesce(p_stripe_subscription_id, v_org.stripe_subscription_id);
    v_new_suspended_at := coalesce(v_org.suspended_at, now());
    v_new_suspend_reason := case when p_status = 'unpaid' then 'stripe_unpaid' else 'stripe_past_due' end;

  -- Priority 2: Subscription Cancellation / Deletion (downgrade to Free)
  elsif p_is_downgrade or p_event_type = 'customer.subscription.deleted' or p_status in ('canceled', 'incomplete_expired') then
    v_new_plan := 'free';
    v_new_sub_id := null;
    -- Clear previous payment suspension as tenant transitions to the free tier
    if v_org.suspend_reason in ('stripe_past_due', 'stripe_unpaid') then
      v_new_suspended_at := null;
      v_new_suspend_reason := null;
    else
      v_new_suspended_at := v_org.suspended_at;
      v_new_suspend_reason := v_org.suspend_reason;
    end if;

  -- Priority 3: Active or Trialing Subscription / Upgrade / Checkout Completed
  elsif p_status in ('active', 'trialing') or p_is_upgrade or p_event_type = 'checkout.session.completed' then
    v_new_plan := p_plan;
    v_new_sub_id := coalesce(p_stripe_subscription_id, v_org.stripe_subscription_id);
    -- Reinstate tenant if suspended due to payment delinquency
    if v_org.suspend_reason in ('stripe_past_due', 'stripe_unpaid') or v_org.suspend_reason is null then
      v_new_suspended_at := null;
      v_new_suspend_reason := null;
    else
      v_new_suspended_at := v_org.suspended_at;
      v_new_suspend_reason := v_org.suspend_reason;
    end if;

  -- Priority 4: Retain current state
  else
    v_new_plan := v_org.plan;
    v_new_sub_id := v_org.stripe_subscription_id;
    v_new_suspended_at := v_org.suspended_at;
    v_new_suspend_reason := v_org.suspend_reason;
  end if;

  -- Step 5: Atomically update organization
  update public.organizations
     set plan = v_new_plan,
         accounts_quota = greatest(p_accounts_quota, 0),
         monthly_message_quota = greatest(p_monthly_message_quota, 0),
         stripe_customer_id = coalesce(p_stripe_customer_id, v_org.stripe_customer_id),
         stripe_subscription_id = v_new_sub_id,
         suspended_at = v_new_suspended_at,
         suspend_reason = v_new_suspend_reason,
         stripe_last_event_created_at = greatest(coalesce(v_org.stripe_last_event_created_at, p_event_created_at), p_event_created_at),
         updated_at = now()
   where id = p_org_id
   returning * into v_updated_org;

  -- Step 6: Record in ledger
  insert into public.stripe_webhook_events (
    event_id, org_id, event_type, stripe_created_at, processed_at, subscription_id, status, plan
  ) values (
    p_event_id, p_org_id, p_event_type, p_event_created_at, now(), p_stripe_subscription_id, 'applied', v_new_plan
  );

  return jsonb_build_object(
    'success', true,
    'status', 'applied',
    'event_id', p_event_id,
    'org_id', p_org_id,
    'plan', v_updated_org.plan,
    'suspended', (v_updated_org.suspended_at is not null),
    'accounts_quota', v_updated_org.accounts_quota,
    'monthly_message_quota', v_updated_org.monthly_message_quota
  );
end;
$$;

do $$
begin
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end
$$;

revoke all on function public.apply_stripe_subscription_atomic from public;
grant execute on function public.apply_stripe_subscription_atomic to service_role;
