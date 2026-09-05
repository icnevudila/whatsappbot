grant select (stripe_customer_id, stripe_subscription_id, webhook_url, webhook_secret) on table public.organizations to authenticated;
grant update (webhook_url, webhook_secret) on table public.organizations to authenticated;
grant select (body_b, ab_percent) on table public.campaigns to authenticated;
grant insert (body_b, ab_percent) on table public.campaigns to authenticated;
grant update (body_b, ab_percent) on table public.campaigns to authenticated;
