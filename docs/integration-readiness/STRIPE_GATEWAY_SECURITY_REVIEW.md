# Stripe and Gateway security review

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

## Separate release scopes — V1 and V2

**V1: NO-GO** for a controlled, Stripe-free pilot until its mandatory controls are proven. **V2: NO-GO before payment activation**, with BILL-01/02/03/04 retained in the payment backlog. Historical billing defects are not V1 payment-feature blockers; safely disabling Checkout/Portal, webhook entitlement effects and payment UI is nevertheless a V1 requirement. Actual pinned code lacks a release-specific disable gate: missing keys disable calls, retained synthetic keys re-enable them. Manual entitlements have server-side admin checks, but durable change audit is unverified and the action/migration RPC signature mismatch is reproduced. Existing admin/tenant/private-media, Gateway compatibility, Wizard E2E and recovery blockers remain mandatory. No production configuration or deployed disable state was inspected or changed. See [V1 decision](V1_INDEPENDENT_GO_NO_GO.md), [V2 backlog](V2_STRIPE_BACKLOG_GO_NO_GO.md), [disable/manual-entitlement review](V1_BILLING_DISABLED_AND_MANUAL_ENTITLEMENTS.md).

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## Launch security blockers and deferred billing evidence

### P0 SEC-01 — Admin cookie can be derived from shipped defaults when required secrets are absent

Owner: Master + security owner. Evidence: [apps/customer/src/app/canli-takip/auth.ts:4](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/canli-takip/auth.ts#L4); [apps/customer/src/app/api/ai-media/outputs/[outputId]/route.ts:39](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/api/ai-media/outputs/%5BoutputId%5D/route.ts#L39).

Actual auth module accepted its deterministic default token in the empty-environment fixture. The media route treats this separate cookie as super-admin and may use a service client. Production configuration was NOT inspected; deployed exploitability is conditional, not claimed.

Recommended fix: Require server-only admin secrets at startup, remove default credentials, require verified platform-admin session for cross-tenant service access; fail closed when configuration is missing.

Retest: Unset either/both secrets: startup/auth must deny; forge default-derived cookie: preview/download remain 401/403; valid tenant A cannot read tenant B.

### Deferred Stripe: P1 BILL-01 — Old subscription deletion bypasses subscription mismatch guard

Owner: Image Fix. Evidence: [apps/customer/src/app/api/billing/webhook/route.ts:155](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/apps/customer/src/app/api/billing/webhook/route.ts#L155); [supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql:108](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql#L108).

Actual POST + actual PL/pgSQL: tenant on sub_current downgraded to free by deletion of sub_obsolete. Existing other-bot SQL test passes sub_OLD directly and misses route nulling.

Recommended fix: Pass event subscription ID even on deletion; clear local ID inside the atomic decision only after matching current subscription.

Retest: Run signed obsolete deletion and incomplete_expired update through actual POST; current plan/subscription unchanged; valid current deletion downgrades.

### Deferred Stripe: P1 BILL-02 — invoice.payment_failed with invoice status open does not suspend

Owner: Image Fix. Evidence: [apps/customer/src/app/api/billing/webhook/route.ts:144](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/apps/customer/src/app/api/billing/webhook/route.ts#L144); [supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql:129](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql#L129).

Actual signed invoice failure with status=open returned 200/applied but suspended_at stayed null.

Recommended fix: Normalize event type separately from invoice lifecycle status, then apply delinquency policy using authoritative subscription state.

Retest: invoice.payment_failed open/draft variants suspend according to policy; payment recovery clears only Stripe-owned suspension; manual/security suspension persists.

### Deferred Stripe: P1 BILL-03 — Paid invoice can downgrade plan and replace current subscription with an obsolete one

Owner: Image Fix. Evidence: [apps/customer/src/app/api/billing/webhook/route.ts:132](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/apps/customer/src/app/api/billing/webhook/route.ts#L132); [apps/customer/src/lib/stripe-prices.ts:17](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/apps/customer/src/lib/stripe-prices.ts#L17); [supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql:109](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql#L109).

Actual paid invoice without subscription-level plan metadata changed pro to starter. An obsolete paid invoice replaced sub_current with sub_obsolete; mismatch guard only covers selected negative statuses.

Recommended fix: Resolve invoice subscription using the pinned Stripe API schema; load authoritative current plan/subscription instead of guessing starter. Enforce identity on all subscription-affecting events.

Retest: Metadata-free current paid invoice retains pro; obsolete invoice success/failure/deletion has no entitlement effect; test invoice parent.subscription_details for supported API version.

### Deferred Stripe: P1 BILL-04 — Unpaid completed Checkout is treated as active entitlement

Owner: Image Fix. Evidence: [apps/customer/src/app/api/billing/webhook/route.ts:117](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/apps/customer/src/app/api/billing/webhook/route.ts#L117).

Actual POST with status=complete/payment_status=unpaid cleared prior Stripe suspension. Payment status is absent from modeled object.

Recommended fix: Gate activation on supported payment/subscription entitlement policy, including asynchronous payment results; completion alone is insufficient for a paid plan.

Retest: Unpaid asynchronous Checkout cannot unsuspend; paid/no_payment_required approved trial paths behave according to explicit policy.

### P1 MEDIA-03 — Private signed media is publicly cacheable beyond signature lifetime

Owner: Image Fix. Evidence: [services/omnistudio/gateway/server.js:3307](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/services/omnistudio/gateway/server.js#L3307).

Exact Gateway media handler over loopback HTTP returned public one-day caching for signed private fixture. No CDN/cache leakage was attempted; potential expiry bypass through shared-cache reuse.

Recommended fix: Emit private,no-store for protected content, or define a reviewed cache strategy bound to authorization/expiry; keep public assets separate.

Retest: Private image/video full/range/HEAD responses have protected cache policy; expiry/revocation deny with shared cache present in isolated staging.

### P1 MEDIA-04 — Gateway byte-range parser accepts out-of-bounds ranges

Owner: Image Fix. Evidence: [services/omnistudio/gateway/server.js:3287](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/services/omnistudio/gateway/server.js#L3287).

Exact handler returned 206 for HEAD bytes=999-1000 on a 21-byte fixture; should return 416. Parser also lacks suffix/multiple/malformed handling; GET error/crash consequences not claimed without isolated process evidence.

Recommended fix: Validate unit, finite integer bounds, suffix/open ranges; clamp end; return 416 with bytes */size; handle read-stream errors.

Retest: Valid range bytes match; suffix ranges work; invalid/multiple/oversized ranges cannot terminate process or hang client.

### P1 SEC-02 — Gateway bearer secret is compared case-insensitively

Owner: Image Fix. Evidence: [services/omnistudio/gateway/public_output_access.js:125](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/services/omnistudio/gateway/public_output_access.js#L125).

Actual verifier accepted the randomly generated master token with all letter case changed. Bearer scheme may be case-insensitive; credential bytes must not be.

Recommended fix: Parse scheme separately, compare exact credential bytes with constant-time digests.

Retest: Bearer scheme casing accepted, token casing change denied; empty/unconfigured token denied.

### P1 SEC-03 — Secret scanner bypasses flagged lines and treats Git failure as success

Owner: Master + Image Fix. Evidence: [scripts/check_secrets.js:15](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/scripts/check_secrets.js#L15); [scripts/check_secrets.js:48](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/scripts/check_secrets.js#L48).

Actual scanner in VM ignored synthetic Bearer credential when same line referenced process.env, and returned zero on Git read failure. No actual credentials printed.

Recommended fix: Never skip a whole line due to marker text; use scoped placeholder handling and fail closed on scanner/Git errors. Validate scanner using synthetic canaries.

Retest: Mixed env/secret line, comments, nested docs, malformed Git context, deleted files and full delivery staged diff; report scope explicitly.

### Deferred Stripe: P1 DB-01 — Stripe ledger has no explicit RLS or tenant read policy

Owner: Image Fix. Evidence: [supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql:9](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql#L9).

Actual migration yields relrowsecurity=false. Repository default-privilege lockdown revokes anon/auth table privileges, so public access is NOT demonstrated. Risk depends on actual migration creator/default ACL drift.

Recommended fix: Enable RLS, revoke anon/auth explicitly, keep server-only ledger unless tenant policy is required; verify actual role grants and function ownership.

Retest: Anon/auth cross-tenant select/insert/update/delete denied; only service role applies atomic events; catalog assertions on clean migration stack.

## Verified controls and remaining gaps

- Actual Gateway verifier denies anonymous media, X-Tenant-Id without credential, invalid/expired HMAC, unknown owner and cross-tenant signed access. Fresh module reload reads fixture owner sidecar. This does not prove every generation path durably registers owner.
- Production loopback alone is denied by actual worker guard; signing without configured secret fails. Master token is intentionally global privilege, must never reach browser.
- Actual atomic SQL maintains sequential replay idempotency and rejects older timestamps. Failure before successful transaction returns HTTP 500 when migration is absent.
- Concurrent event replay is **UNVERIFIED**: initial ledger lookup occurs before org row lock; a second caller may wait then reach duplicate insert. Transaction rollback protects state, but retry/HTTP behavior requires real separate PostgreSQL connections. Same-second distinct events are not ordered by a tie-breaker.
- Ledger lack of RLS is conditional ACL risk; repository lockdown prevents declaring an anonymous exploit without deployed grants. No live attack, customer query or secret rotation occurred.
- Private NEEDS_REVIEW preview authorizes owned jobs and labels response; full publish/download review eligibility must be tested against actual approval state.

## Primary reference checks

Reviewed [Stripe webhook delivery/signatures](https://docs.stripe.com/webhooks), [invoice object schema](https://docs.stripe.com/api/invoices/object), [Supabase RLS/grants](https://supabase.com/docs/guides/database/postgres/row-level-security) and Supabase changelog index. Pin the deployed Stripe API version before implementing invoice extraction. The route models only top-level subscription; current invoice parent details need version-specific fixtures.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**Deferred Stripe migration delivery dependency (P1 before future activation)**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
