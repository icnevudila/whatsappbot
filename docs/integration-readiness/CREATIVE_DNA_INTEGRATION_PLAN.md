# Creative DNA integration plan

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

## Separate release scopes — V1 and V2

**V1: NO-GO** for a controlled, Stripe-free pilot until its mandatory controls are proven. **V2: NO-GO before payment activation**, with BILL-01/02/03/04 retained in the payment backlog. Historical billing defects are not V1 payment-feature blockers; safely disabling Checkout/Portal, webhook entitlement effects and payment UI is nevertheless a V1 requirement. Actual pinned code lacks a release-specific disable gate: missing keys disable calls, retained synthetic keys re-enable them. Manual entitlements have server-side admin checks, but durable change audit is unverified and the action/migration RPC signature mismatch is reproduced. Existing admin/tenant/private-media, Gateway compatibility, Wizard E2E and recovery blockers remain mandatory. No production configuration or deployed disable state was inspected or changed. See [V1 decision](V1_INDEPENDENT_GO_NO_GO.md), [V2 backlog](V2_STRIPE_BACKLOG_GO_NO_GO.md), [disable/manual-entitlement review](V1_BILLING_DISABLED_AND_MANUAL_ENTITLEMENTS.md).

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## Design-only, feature disabled

### P2 DNA-01 — Enabled Creative DNA adapter declares transformation but only enriches metadata

Owner: Video Engine + Master. Evidence: [apps/customer/src/lib/creative/v2/creative-dna-adapter.ts:68](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/lib/creative/v2/creative-dna-adapter.ts#L68); [docs/research/IMPLEMENTATION_PROPOSAL.md:55](https://github.com/icnevudila/whatsappbot/blob/73a0fd730c41c2f843794eb05d9762168215b088/docs/research/IMPLEMENTATION_PROPOSAL.md#L55).

Actual enabled adapter adds version/bridge-ready markers; no three strategies, nine hooks or owned-asset validation. Research TypeScript remains documentation.

Recommended fix: Keep flag off; agree versioned schema, validation, selection persistence and asset/claim constraints before executable integration. Remove misleading ready marker until contract satisfied.

Retest: 3x3 cardinality, selected-hook membership, tenant asset ownership, verified claims, product/logo SHA, mode separation and rollback flag.


Proposal: [typed contract](../../tests/integration-readiness/proposed-creative-dna-contract.ts). It deliberately cannot be treated as executable production integration.

1. Owned business + immutable brand-kit version + owned catalog product supply verified product-reference and original-logo asset IDs, storage paths, byte sizes and SHA256. Recheck ownership/bytes at selection and execution.
2. Verified goal and facts produce exactly three strategy options, each with exactly three hooks. Evidence tags distinguish observed trends, hypotheses and verified cases; scores have no promised conversion meaning.
3. Store recommendation ID, request hash, source IDs and expiry. User selects a hook belonging to the selected strategy for the same org/product; reject stale recommendations after asset/fact edits.
4. Compile only selected, validated data into an 8-second Veo plan and deterministic 2-second outro. PERFORMANCE_AD may use verified offer/price/CTA facts; BRAND_FILM must not silently acquire campaign claims. Image plans use the same identity/ownership gates, separate rendering contract.
5. Existing production engine consumes a new version only behind server-authoritative flag, off by default; research documents are not imports or executable prompts. Adapter runtime validation must enforce cardinality, enum values, role assignments, SHA and mandatory references.
6. Persist recommendation/selection/plan provenance into job and library receipt; journal accepts feedback as research hypotheses, not automatic commercial promises.

Proposed data: creative_dna_recommendations(org_id, product_id, schema_version, request_hash, expires_at, payload), creative_dna_selections(org_id, recommendation_id, strategy_id, hook_id, selected_by), plan_receipt references. This is a schema design, no migration was executed. Tenant RLS and unique scoped IDs are required.

Master adapter omits business/product identity, evidence-backed claims, goals, selected approach/hook, hashes and temporal validation; research proposal is richer but URLs alone do not establish ownership. TypeScript strict compile is delivery validation only.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**Deferred Stripe migration delivery dependency (P1 before future activation)**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
