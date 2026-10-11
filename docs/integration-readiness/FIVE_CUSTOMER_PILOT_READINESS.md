# Five customer pilot readiness

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

## Separate release scopes — V1 and V2

**V1: NO-GO** for a controlled, Stripe-free pilot until its mandatory controls are proven. **V2: NO-GO before payment activation**, with BILL-01/02/03/04 retained in the payment backlog. Historical billing defects are not V1 payment-feature blockers; safely disabling Checkout/Portal, webhook entitlement effects and payment UI is nevertheless a V1 requirement. Actual pinned code lacks a release-specific disable gate: missing keys disable calls, retained synthetic keys re-enable them. Manual entitlements have server-side admin checks, but durable change audit is unverified and the action/migration RPC signature mismatch is reproduced. Existing admin/tenant/private-media, Gateway compatibility, Wizard E2E and recovery blockers remain mandatory. No production configuration or deployed disable state was inspected or changed. See [V1 decision](V1_INDEPENDENT_GO_NO_GO.md), [V2 backlog](V2_STRIPE_BACKLOG_GO_NO_GO.md), [disable/manual-entitlement review](V1_BILLING_DISABLED_AND_MANUAL_ENTITLEMENTS.md).

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## Pilot decision: NO-GO until blockers close

100–300 businesses is a product target, not measured capacity. Minimum launch cohort is 3–5 controlled pilot tenants only after media/security blockers and fresh isolated E2E.

| Gate | Minimum proof | Current independent status |
|---|---|---|
| Tenant boundaries | Two synthetic unrelated tenants, API/Storage/Gateway negatives | Gateway verifier proven; full stack BLOCKED |
| Stripe billing (deferred) | Not required for initial launch | Findings retained for future activation |
| Media | Original asset SHA, 206 seek, download hash, review gates | Contract failures confirmed; browser decode BLOCKED |
| Idempotency | Same job in two tabs/worker retry, no duplicate provider call | Source safeguards present; full proof BLOCKED |
| Recovery | App/worker restart with pending job and persistent media | Owner sidecar unit verified; stack recovery BLOCKED |
| Restore | Isolated database+media restore, audited retention | Not run independently |
| Observability | Queue oldest age, failures, pool use, per-tenant correlation | Required before pilot |

## Infrastructure budget and backpressure

PG pool budget = sum(all running worker/scaler/panel pool maxima) + migration/admin headroom; measure it against connection limit and Supavisor mode. WA default worker pool=10 and MAX_SESSIONS=50 are defaults, not capacity proof. Enable production certificate verification.

Limit browser work by actual healthy eligible accounts; one active lease/account across processes. Reject admission when queue age/depth exceeds reviewed limits, don't accept infinite pending work. Bound polling, exponential retry and timeout reconciliation; status reads cannot create paid retries. Signed media must preserve authorization and avoid downloading/hashing the whole video on every seek at scale; Master currently buffers entire upstream before serving a requested range.

Before pilot, record baseline and 3/5 seeded-tenant runs with provider stubs: p95 request/job completion, CPU/RAM per browser, pool connections, egress per preview/seek, health latency, Stripe backlog and disk utilization. Proposed thresholds must be approved from measurements; no numerical customer capacity inferred. A historical Sales probe timed out WA readiness at 30 concurrent request threads; its subsequent source single-flight fix has no independent deployed load proof here.

Progression: 3 synthetic → 5 synthetic → restricted 3–5 human pilots only after explicit release approval. Real WhatsApp send/payment/provider tests require separate authorization and remain outside this task.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**Deferred Stripe migration delivery dependency (P1 before future activation)**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
