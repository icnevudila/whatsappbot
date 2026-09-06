-- Stripe: free plana dusunce subscription_id temizlenir.
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
         stripe_subscription_id = case
           when p_plan = 'free' then null
           else coalesce(p_stripe_subscription_id, o.stripe_subscription_id)
         end,
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
