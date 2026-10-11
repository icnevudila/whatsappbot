# V1 payment disable and manual entitlement verification

> User decision: V1 has no Stripe subscriptions or automatic online payment; V2 may introduce them later. Frozen Master SHA: `374c0381d8bd309ccb275e3712533784cc9a044e`; Sales follow-up SHA: `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a`. Original Research SHA remains `73a0fd730c41c2f843794eb05d9762168215b088`. Independent audit branch only; no other bot files, production, real payment, WhatsApp send, credential rotation or customer data changed.

## Result: safe V1 disable is NOT verified

V1 product intent does not disable existing configured code. The manual-mode environment name used by the fixture is a proposed negative canary, not an existing implemented application flag. Deployment keys were neither read nor removed. No payment interface was actually changed by this audit.

### P1 V1-OFF-01 — Checkout/Portal are credential-gated, not V1-disabled

Status: **FAIL_IN_PINNED_CODE**. Owner: Master + Image Fix. Evidence: [apps/customer/src/app/api/billing/checkout/route.ts:28](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/api/billing/checkout/route.ts#L28); [apps/customer/src/app/api/billing/portal/route.ts:19](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/api/billing/portal/route.ts#L19); [apps/customer/src/lib/stripe-cancel.ts:8](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/lib/stripe-cancel.ts#L8).

Absent keys yield 503 with zero network calls. Retained synthetic keys cause two captured Stripe calls even with manual-mode negative canary. No real call was made. Separate static inventory also finds the organization-deletion subscription cancellation helper gated only by STRIPE_SECRET_KEY; that helper was not runtime-tested and no organization was deleted.

Fix/retest: One server-authoritative billing policy defaults to manual/off; payment routes return disabled before parsing/payment/provider work even if credentials remain. Apply policy to the subscription cancellation helper and define legacy-subscription handling explicitly. Test direct URL/API access, not just hidden buttons.

### P1 V1-OFF-02 — Webhook can still automatically change packages when configured

Status: **FAIL_IN_PINNED_CODE**. Owner: Image Fix. Evidence: [apps/customer/src/app/api/billing/webhook/route.ts:77](https://github.com/icnevudila/whatsappbot/blob/0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a/apps/customer/src/app/api/billing/webhook/route.ts#L77); [apps/customer/src/app/api/billing/webhook/route.ts:158](https://github.com/icnevudila/whatsappbot/blob/0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a/apps/customer/src/app/api/billing/webhook/route.ts#L158).

Absent webhook secret returns 503 before DB. With valid synthetic signature and keys, actual POST calls entitlement RPC with p_is_upgrade=true despite manual-mode canary.

Fix/retest: In V1 the webhook must cause no entitlement/subscription/quota/suspension write; disable before DB effects. Define safe ack/rejection behavior and record ignored deliveries without upgrades. Gate legacy Stripe RPC invocation paths as well.

### P1 V1-UI-01 — Payment success UI remains query-driven

Status: **FAIL_IN_PINNED_CODE**. Owner: Master. Evidence: [apps/customer/src/app/(panel)/ayarlar/page.tsx:49](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/(panel)/ayarlar/page.tsx#L49).

Actual settings component emits payment-success message solely from billing=ok, with no payment receipt or release policy check.

Fix/retest: Hide/disable payment entry points, portal and payment success/cancel UI in V1. Expose manual account/plan support text. In V2 success must rely on authoritative receipt; URL query is not payment evidence.

### P1 V1-ENT-01 — Manual package changes need attributable audit history

Status: **AUDIT_DURABILITY_UNVERIFIED**. Owner: Admin/backend owner. Evidence: [supabase/migrations/20260905150000_jobs_cancel_admin_org.sql:30](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/supabase/migrations/20260905150000_jobs_cancel_admin_org.sql#L30); [apps/admin/src/lib/platform.ts:7](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/admin/src/lib/platform.ts#L7); [supabase/migrations/20260905150000_jobs_cancel_admin_org.sql:16](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/supabase/migrations/20260905150000_jobs_cancel_admin_org.sql#L16).

Actual platform identity ignores user_metadata. Actual SQL denies non-admin and permits fixture-admin. Provided action/function writes plan/quota, but no before/after/actor/reason audit insert is present; external/deployed audit trigger is unverified.

Fix/retest: Use verified platform-admin identity and server-controlled values; atomically record actor, org, before/after quotas/plan, reason, timestamp, correlation ID and authorization result. Prove non-admin, cross-tenant and replay behavior.

### P1 V1-ENT-02 — Manual quota action and migration RPC signatures disagree

Status: **FAIL_MIGRATION_CONTRACT**. Owner: Admin/backend owner. Evidence: [apps/admin/src/app/org-actions.ts:67](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/admin/src/app/org-actions.ts#L67); [supabase/migrations/20260905150000_jobs_cancel_admin_org.sql:16](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/supabase/migrations/20260905150000_jobs_cancel_admin_org.sql#L16).

Actual action sends p_monthly_video_quota; sole checked-in admin_update_organization definition has four parameters. Embedded PostgreSQL reports function does not exist when called with the action arguments. Deployed schema may differ and was not inspected.

Fix/retest: Deliver reviewed additive migration for the exact RPC contract, preserve privilege/admin checks and add atomic audit. Test migration upgrade and actual action -> PostgREST -> PG path before pilot.

## Server-side entitlement controls

Positive evidence: admin action calls requirePlatformAdmin; platform flag comes from app_metadata, not user-editable user_metadata; SQL independently calls is_platform_admin. Customer updateProfile intentionally excludes plan/quota fields. These are useful controls, but not a complete entitlement audit/durability proof.

Required tests before V1: unauthorized direct RPC/REST writes denied; tenant A cannot assign B's plan; admin update creates a durable attributable before/after receipt in the same transaction; quota enforcement uses server state; application restart retains assignment; audit failure rolls back assignment. Existing database RLS/GRANT state and auth identities must be checked in an isolated migrated stack.

## Validation boundaries

8/8 targeted audit tests passed, including deliberate defect reproductions. Actual route/component/action source and actual PL/pgSQL were executed using synthetic keys/tenants, a VM, blocked/spied provider calls, mocked Next/Supabase transports and embedded PostgreSQL. Zero real Stripe/DB requests. Missing-keys success proves only that configuration, not a safe V1 feature gate. Full browser journey, actual PostgREST/Storage, production configuration, real multi-connection PG and restart/restore remain BLOCKED/UNVERIFIED. Prior core evidence remains unchanged: 20 checks passed and 1 full-browser test skipped on each historical snapshot.

[V1 test evidence](evidence/v1-launch-tests.tap); [original findings](evidence/findings.json); [initial/follow-up SHA evidence](evidence/snapshot.json).
