# Safe merge sequence

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

## Initial launch scope — user clarification

Stripe subscriptions are **not part of the initial product release**. Stripe billing defects, the Stripe ledger/RLS finding and Stripe migration delivery dependency are deferred integration work, **not launch or pilot blockers**. Their historical evidence remains valid. No billing code was changed or enabled. The remaining NO-GO rests on media authorization/playback, tenant/admin security and missing independent customer-journey/recovery evidence.

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## No merge performed

Pairwise merge-tree has no textual conflicts at frozen SHAs. Semantic incompatibility means blind integration is unsafe. A combined three-branch build was not run because unresolved contracts must first be corrected by their owners.

1. Freeze and label source SHAs; save current production app/Gateway/WA build IDs and database migration state in release ticket. This audit has not queried production.
2. Owners repair SEC-01, MEDIA-01..04 and SEC-02..03 for launch; BILL-01..04 are deferred; audit new SHAs as a new snapshot, don't edit frozen results.
3. Stripe ledger migration is not required for initial launch. Before future Stripe activation, apply a reviewed additive migration and verify roles/RLS/RPC, old events and concurrent replay; never rewrite an already-applied migration.
4. Integrate hardened Gateway **together with** Master authenticated proxy, signed-query preservation, private image delivery and WA worker fetch contract. Don't deploy Gateway restriction before compatible clients; don't privatize creatives until legacy public URL references are addressed.
5. Integrate Wizard/library changes, run client build/typecheck plus API contract and full seeded browser journey. Gate NEEDS_REVIEW publication separately from owned preview.
6. Incorporate research documentation only; DNA flag remains off. Implement executable 3x3 selection only in a later versioned release with asset/claim tests.
7. Repeat safe merge-tree and fixed-snapshot tests on updated candidate; inspect migration history and retention. Only a separately authorized release may merge main/deploy.

## Rollback

Pin previous signed-media-compatible app and Gateway builds as a **pair**. Stop new generation admission if release degrades; reconcile in-flight jobs using durable IDs. Revert code to last mutually compatible private-media build; keep additive ledger/history migrations unless separately reviewed. Never make bucket public or remove tenant checks to restore playback. Keep processed event IDs during billing rollback to prevent replay entitlement changes. Restore DB/media only from separately validated backups when necessary, preserving newer receipts and audit history.

No destructive rollback SQL, production change or active branch rewrite is delivered.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**Deferred Stripe migration delivery dependency (P1 before future activation)**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
