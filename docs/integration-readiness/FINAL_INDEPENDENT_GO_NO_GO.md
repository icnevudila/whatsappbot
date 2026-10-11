# Final independent go / no-go

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## NO-GO for integration release and commercial pilot

| Question | Independent answer |
|---|---|
| Can three branches merge safely? | Git text merge is clean; release integration is unsafe until reproduced contracts/billing/security defects close. |
| Which files conflict? | No textual conflicts in three pairwise frozen merge-tree checks; five Master/Sales overlaps are listed in compatibility report. Shared-history research overlap is larger. |
| Does hardened Gateway break playback? | Yes: actual Master owned-preview route returned 502/upstream 401 in fixture; signed URLs also lose query during normalization. |
| Is Stripe safe? | Not yet: old deletion, failed invoice status, old paid invoice/plan fallback and unpaid checkout defects reproduced. |
| Is 60/60 reliable? | Only within individual limited assertions: 34 browser-oriented, 7 unit, 11 static, 8 unverified. Not 60 customer E2E proofs. |
| What is missing for DNA? | Runtime contract validation, owned hashed product/logo, verified claims, 3x3 options, persisted selection/versioning; flag stays off. |
| Before 3–5 pilots? | Close P0/P1 blockers, prove seeded cross-tenant full journey, PG concurrency, private media/worker fetch, restart/restore and measured resource budget. |
| Safest sequence? | Owners fix contracts → new pinned snapshot → additive DB/roles → compatible Gateway/client pair → Wizard/private media → full isolated E2E → research docs with flag off. |

- **P0 SEC-01**: Admin cookie can be derived from shipped defaults when required secrets are absent — Master + security owner.
- **P1 MEDIA-01**: Unsigned Master upstream video request is incompatible with signed-only Gateway — Master + Image Fix.
- **P1 MEDIA-02**: Media normalization discards signed query; private bucket still resolves as public — Master.
- **P1 BILL-01**: Old subscription deletion bypasses subscription mismatch guard — Image Fix.
- **P1 BILL-02**: invoice.payment_failed with invoice status open does not suspend — Image Fix.
- **P1 BILL-03**: Paid invoice can downgrade plan and replace current subscription with an obsolete one — Image Fix.
- **P1 BILL-04**: Unpaid completed Checkout is treated as active entitlement — Image Fix.
- **P1 MEDIA-03**: Private signed media is publicly cacheable beyond signature lifetime — Image Fix.
- **P1 MEDIA-04**: Gateway byte-range parser accepts out-of-bounds ranges — Image Fix.
- **P1 SEC-02**: Gateway bearer secret is compared case-insensitively — Image Fix.
- **P1 QA-01**: 60/60 mixes static checks, weak browser checks and assertion-free callbacks — Master.
- **P1 SEC-03**: Secret scanner bypasses flagged lines and treats Git failure as success — Master + Image Fix.
- **P1 DB-01**: Stripe ledger has no explicit RLS or tenant read policy — Image Fix.
- **P1 OPS-01**: Independent customer capacity and recovery remain unmeasured — Image Fix + infrastructure.
- **P2 DNA-01**: Enabled Creative DNA adapter declares transformation but only enriches metadata — Video Engine + Master.
- **P2 OPS-02**: Postgres TLS certificate verification defaults off — Image Fix.

No deployed vulnerability, commercial capacity, UI fix, fresh browser success or customer account state is asserted from these isolated tests. Changes are confined to the independent audit docs/tools branch; bot production files remain untouched. Commit/push receipts are reported separately after delivery validation.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**P1 migration delivery dependency**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
