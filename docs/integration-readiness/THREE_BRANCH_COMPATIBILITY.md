# Three branch compatibility

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## Text conflicts versus semantic conflicts

### master + sales

Result: **CLEAN_TEXT_MERGE**; 5 overlapping changed paths, 0 Git conflict paths. This is pairwise git merge-tree evidence, not a build or runtime integration test.

Overlapping paths:

- `scripts/check_secrets.js`
- `services/omnistudio/gateway/gateway_request_guard.js`
- `services/omnistudio/gateway/server.js`
- `services/omnistudio/gateway/test/gateway-contract.test.js`
- `services/omnistudio/gateway/test/omniagent_optimization.test.js`

### master + research

Result: **CLEAN_TEXT_MERGE**; 221 overlapping changed paths, 0 Git conflict paths. This is pairwise git merge-tree evidence, not a build or runtime integration test.

Overlapping paths:

Full 221-path list: evidence/snapshot.json. Large overlap includes inherited shared history, not necessarily simultaneous divergent edits.

### sales + research

Result: **CLEAN_TEXT_MERGE**; 5 overlapping changed paths, 0 Git conflict paths. This is pairwise git merge-tree evidence, not a build or runtime integration test.

Overlapping paths:

- `scripts/check_secrets.js`
- `services/omnistudio/gateway/gateway_request_guard.js`
- `services/omnistudio/gateway/server.js`
- `services/omnistudio/gateway/test/gateway-contract.test.js`
- `services/omnistudio/gateway/test/omniagent_optimization.test.js`

## Required contract reconciliation

| Contract | Result | Owner |
|---|---|---|
| Owned preview → signed-only Gateway | Confirmed 502 / upstream 401 | Master + Image Fix |
| getSafeMediaUrl → signed URL | Signature stripped | Master |
| Private creatives bucket → public image paths | Incompatible path generation | Master |
| Range byte identity | Master validates whole object before range; Gateway invalid ranges need fix | Both |
| NEEDS_REVIEW | Owned explicit preview exists; real combined UI/download negative tests blocked | Master |
| creative_id handoff | Actions compare owned creative/media/type; exact URL changes must update handoff/worker contract | Master + WA owner |
| DNA research → adapter | Interface proposal only; metadata transformation not executable contract | Video Engine + Master |

Image generation polling includes persisted IDs and compare-and-set updates in [apps/customer/src/lib/creative/process.ts:574](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/lib/creative/process.ts#L574); this is materially stronger than A19/A20 source-name checks, but concurrent PostgreSQL/worker exactly-once behavior is still not independently proven.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**P1 migration delivery dependency**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
