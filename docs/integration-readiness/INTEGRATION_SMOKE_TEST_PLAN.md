# Integration smoke test plan

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

## Separate release scopes — V1 and V2

**V1: NO-GO** for a controlled, Stripe-free pilot until its mandatory controls are proven. **V2: NO-GO before payment activation**, with BILL-01/02/03/04 retained in the payment backlog. Historical billing defects are not V1 payment-feature blockers; safely disabling Checkout/Portal, webhook entitlement effects and payment UI is nevertheless a V1 requirement. Actual pinned code lacks a release-specific disable gate: missing keys disable calls, retained synthetic keys re-enable them. Manual entitlements have server-side admin checks, but durable change audit is unverified and the action/migration RPC signature mismatch is reproduced. Existing admin/tenant/private-media, Gateway compatibility, Wizard E2E and recovery blockers remain mandatory. No production configuration or deployed disable state was inspected or changed. See [V1 decision](V1_INDEPENDENT_GO_NO_GO.md), [V2 backlog](V2_STRIPE_BACKLOG_GO_NO_GO.md), [disable/manual-entitlement review](V1_BILLING_DISABLED_AND_MANUAL_ENTITLEMENTS.md).

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## Runnable now

Use tests/integration-readiness README and fixed source loader. Scope: actual JS verifier + HTTP handler; actual TypeScript route bodies, isolated transport doubles and embedded PostgreSQL migration. Synthetic tenant fixtures only. New defect tests must not be counted as safe-product PASS.

## Before merge: mandatory scenarios

| Scenario | Assert | Evidence class required |
|---|---|---|
| Signed preview, thumbnail, Range, download | Owned media succeeds, exact response bytes/hash, no secret in browser | REAL_INTEGRATION + REAL_BROWSER_E2E |
| Tenant negatives | A cannot access B via direct output ID, guessed URL, forged header/cookie | REAL_INTEGRATION |
| Invalid/expired signature and unknown owner | 401/403, no readable bytes, no public cache | REAL_INTEGRATION |
| Restart | owner/job/final file survives process/container recreation | REAL_INTEGRATION |
| NEEDS_REVIEW | private preview allowed only owned review, publication denied | REAL_INTEGRATION + REAL_BROWSER_E2E |
| Stripe events (deferred; not an initial-launch gate) | failed/succeeded/updated/deleted/checkout signed payloads reflect correct current sub | REAL_INTEGRATION |
| Stripe race/replay/out-of-order (deferred) | Separate PG clients duplicate same event; no unsafe state/double entitlement | REAL_INTEGRATION |
| Recovery/idempotency | Two tabs one job; F5 returns same job; stale approval/version rejected | REAL_BROWSER_E2E + DB read-back |
| Save/reopen | DB draft exists, new session reads exact content and creative_id | REAL_BROWSER_E2E + REAL_INTEGRATION |
| Mobile | Controls and preview usable at each viewport, no empty-selector pass | REAL_BROWSER_E2E |
| DNA flag off | No provider payload change; contract-only proposal | UNIT_TEST |
| Secret scanner | Synthetic canaries rejected; scan scope/Git errors fail closed | UNIT_TEST + STATIC_CODE_CHECK |

## Isolation setup

Prepare an independent seeded auth/app/DB/Storage/Gateway fixture stack with fake provider and WA adapters, no production env files. Block outbound provider/payment/message domains at harness network layer. Use synthetic UUIDs and generated keys, ephemeral ports, explicit teardown, test DB name checks and artifact redaction. Existing production/local services owned by bots are not test fixtures. Network spies verify zero prohibited requests instead of logging claims.

Not available in this audit: full seeded app, real PostgREST/Storage, separate PostgreSQL connection race or actual browser playback. Those checks remain **BLOCKED**; no GO is issued.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**Deferred Stripe migration delivery dependency (P1 before future activation)**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
