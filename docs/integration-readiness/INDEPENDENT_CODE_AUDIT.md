# Independent code audit

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

## Separate release scopes — V1 and V2

**V1: NO-GO** for a controlled, Stripe-free pilot until its mandatory controls are proven. **V2: NO-GO before payment activation**, with BILL-01/02/03/04 retained in the payment backlog. Historical billing defects are not V1 payment-feature blockers; safely disabling Checkout/Portal, webhook entitlement effects and payment UI is nevertheless a V1 requirement. Actual pinned code lacks a release-specific disable gate: missing keys disable calls, retained synthetic keys re-enable them. Manual entitlements have server-side admin checks, but durable change audit is unverified and the action/migration RPC signature mismatch is reproduced. Existing admin/tenant/private-media, Gateway compatibility, Wizard E2E and recovery blockers remain mandatory. No production configuration or deployed disable state was inspected or changed. See [V1 decision](V1_INDEPENDENT_GO_NO_GO.md), [V2 backlog](V2_STRIPE_BACKLOG_GO_NO_GO.md), [disable/manual-entitlement review](V1_BILLING_DISABLED_AND_MANUAL_ENTITLEMENTS.md).

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## Decision: NO-GO

Text merges are clean, but cross-branch media defects were reproduced; historical billing findings are deferred. Production exploitability and capacity are not inferred from local tests.

## Branch architecture and tested boundaries

- **Master**: Wizard V3, company/project-isolated Gateway changes, durable image intent recovery, verified video byte delivery, private storage migration and browser acceptance harness. Evidence classes differ by test; 60/60 is not an integrated production certificate. Two-tab paid-job and actual DB draft persistence remain unverified. Technical debt: guessed media hosts, public URL compatibility, permissive admin-cookie fallback, any-typed media route.
- **Image Fix / Sales**: signed media verifier + owner sidecar, strict worker-control authorization, fail-closed distributed leases, WA health single-flight, atomic Stripe ledger migration. Negative Gateway auth and actual SQL were independently exercised. Stripe route-to-SQL identity/status translation remains defective; browser/cache semantics and multi-process races are unverified.
- **Video Engine / Research**: latest two commits add research documents; branch also inherits earlier Wizard/Gateway changes shared with Master. It is NOT purely documentation relative to main. References, methodology classifications and 3x3 proposal are useful design inputs; empirical claims are not runtime validation. Research performance case provenance was not independently fetched, no performance or commercial guarantee approved.

## Change inventory

- master: 246 changed paths relative to merge-base with frozen main.
- sales: 76 changed paths relative to merge-base with frozen main.
- research: 245 changed paths relative to merge-base with frozen main. Complete path lists are in snapshot.json. No uncommitted active-bot work is included.

## Findings

### P0 SEC-01 — Admin cookie can be derived from shipped defaults when required secrets are absent

Owner: Master + security owner. Evidence: [apps/customer/src/app/canli-takip/auth.ts:4](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/canli-takip/auth.ts#L4); [apps/customer/src/app/api/ai-media/outputs/[outputId]/route.ts:39](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/api/ai-media/outputs/%5BoutputId%5D/route.ts#L39).

Actual auth module accepted its deterministic default token in the empty-environment fixture. The media route treats this separate cookie as super-admin and may use a service client. Production configuration was NOT inspected; deployed exploitability is conditional, not claimed.

Recommended fix: Require server-only admin secrets at startup, remove default credentials, require verified platform-admin session for cross-tenant service access; fail closed when configuration is missing.

Retest: Unset either/both secrets: startup/auth must deny; forge default-derived cookie: preview/download remain 401/403; valid tenant A cannot read tenant B.

### P1 MEDIA-01 — Unsigned Master upstream video request is incompatible with signed-only Gateway

Owner: Master + Image Fix. Evidence: [apps/customer/src/app/api/ai-media/outputs/[outputId]/route.ts:162](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/api/ai-media/outputs/%5BoutputId%5D/route.ts#L162); [services/omnistudio/gateway/public_output_access.js:203](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/services/omnistudio/gateway/public_output_access.js#L203).

Actual Master GET and actual Sales verifier: owned approved fixture returns 502 after upstream 401. Next/auth/database transports are isolated doubles; no deployed browser run.

Recommended fix: Authorize the server-to-server fetch after owned-output checks; use scoped signing or a server-only token, preserve Range semantics and avoid exposing master token.

Retest: Approved and owned review preview, thumbnail, library and full download succeed against hardened Gateway; cross-tenant and expired access deny.

### P1 MEDIA-02 — Media normalization discards signed query; private bucket still resolves as public

Owner: Master. Evidence: [apps/customer/src/lib/media-url.ts:24](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/lib/media-url.ts#L24); [apps/customer/src/lib/media-url.ts:66](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/lib/media-url.ts#L66); [supabase/migrations/20261010150000_private_creatives_storage.sql:4](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/supabase/migrations/20261010150000_private_creatives_storage.sql#L4).

Actual media-url module strips sig/exp/tid from signed Gateway URL. Actual resolver emits a public creatives URL although migration makes bucket private.

Recommended fix: Use owned application media IDs and authenticated proxy/signed storage delivery; preserve validated signature parameters without trusting arbitrary hosts. Inventory/backfill legacy public_url values before migration.

Retest: Signed URL survives normalization; fresh and historical images render in private bucket; expired links renew only after tenant authorization.

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

### P1 QA-01 — 60/60 mixes static checks, weak browser checks and assertion-free callbacks

Owner: Master. Evidence: [scripts/master_60_acceptance_runner.mjs:344](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/scripts/master_60_acceptance_runner.mjs#L344); [scripts/master_60_acceptance_runner.mjs:523](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/scripts/master_60_acceptance_runner.mjs#L523); [scripts/master_60_acceptance_runner.mjs:640](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/scripts/master_60_acceptance_runner.mjs#L640).

All 60 callbacks classified independently. 34 browser-oriented checks, 7 unit, 11 static, 8 unverified. Categories describe mechanism, not 34 independently verified passes.

Recommended fix: Expose evidence class and required assertions per acceptance item. Fail on empty optional branches; record deployment/source identity and network/DB receipts.

Retest: Pending-job F5, two tabs, actual DB draft save/reopen, signed media tenant negatives and mobile controls must run in seeded isolated stack.

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

### P1 OPS-01 — Independent customer capacity and recovery remain unmeasured

Owner: Image Fix + infrastructure. Evidence: [apps/wa-service/src/env.ts:80](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/apps/wa-service/src/env.ts#L80); [apps/wa-service/src/db.ts:19](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/apps/wa-service/src/db.ts#L19).

Source defaults are configuration, not verified simultaneous businesses. Existing load report distinguishes request-thread load and synthetic queue jobs; its WA health timeouts are historical, no current rerun.

Recommended fix: Measure 3-5 seeded tenants across real app/queue/worker/storage, with providers stubbed; establish pool budget, eligible browser count, admission/backpressure and restore recovery.

Retest: Collect p95 latency, connection use, queue oldest age, RAM, retry/dedup, health under load and crash recovery before pilot.

### P2 DNA-01 — Enabled Creative DNA adapter declares transformation but only enriches metadata

Owner: Video Engine + Master. Evidence: [apps/customer/src/lib/creative/v2/creative-dna-adapter.ts:68](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/lib/creative/v2/creative-dna-adapter.ts#L68); [docs/research/IMPLEMENTATION_PROPOSAL.md:55](https://github.com/icnevudila/whatsappbot/blob/73a0fd730c41c2f843794eb05d9762168215b088/docs/research/IMPLEMENTATION_PROPOSAL.md#L55).

Actual enabled adapter adds version/bridge-ready markers; no three strategies, nine hooks or owned-asset validation. Research TypeScript remains documentation.

Recommended fix: Keep flag off; agree versioned schema, validation, selection persistence and asset/claim constraints before executable integration. Remove misleading ready marker until contract satisfied.

Retest: 3x3 cardinality, selected-hook membership, tenant asset ownership, verified claims, product/logo SHA, mode separation and rollback flag.

### P2 OPS-02 — Postgres TLS certificate verification defaults off

Owner: Image Fix. Evidence: [apps/wa-service/src/db.ts:13](https://github.com/icnevudila/whatsappbot/blob/17b8eb765b408784a7ac11ed4ef3974c7281cc0f/apps/wa-service/src/db.ts#L13).

Static code default permits unverified server certificate; production env not inspected.

Recommended fix: Require certificate verification and documented CA in production; development exception explicit.

Retest: Valid CA connects; invalid/self-signed unexpected certificate fails; readiness reports failure without secret leakage.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**Deferred Stripe migration delivery dependency (P1 before future activation)**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
