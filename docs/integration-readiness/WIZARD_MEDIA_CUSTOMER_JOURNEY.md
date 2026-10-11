# Wizard media customer journey

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## Full journey: BLOCKED for independent browser acceptance

No isolated seeded Next/auth/PostgREST/Storage/provider-worker stack was available. Existing localhost or production applications may serve real tenant data and other bots' jobs; those were not used as this auditor's fixture. No customer was created or charged.

| Step | Code evidence / conclusion | Required fresh proof |
|---|---|---|
| Signup → organization | Not independently exercised | Synthetic account/org creation and membership/RLS read-back |
| Brand kit → product | Master contains canonical-reference gates; historical label checks insufficient | Missing logo/product block; uploaded bytes/SHA belong to current org |
| Wizard → goals/text | Commercial-integrity unit checks exist; delayed-AI overwrite not proven | All tones/actions, exact verified price/claim and delayed user edit protection |
| Generation → progress | Persistent job IDs and compare-and-set recovery exist | Two tabs same request; one persisted/provider job; F5 pending recovery |
| Library → preview | Signed Gateway incompatibility confirmed | Approved/review media actual decode and original logo/product checks |
| Download | Metadata download check differs from browser user action | Owned full bytes match SHA; tenant negatives, expiry and Range controls |
| Use in campaign | Owned creative/media/type checked by action | creative_id preserved; worker can fetch private media without customer cookie |
| Save draft → reopen | LocalStorage recovery exists; database save not proven by 60-runner | Server insert/read-back/new session/device reopen; no send occurs |
| Mobile | Library overflow probes only | Wizard/progress/preview/draft tap flow at 375/390/430 widths |

Relevant paths: [apps/customer/src/app/(panel)/kampanyalar/campaign-wizard.tsx:237](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/(panel)/kampanyalar/campaign-wizard.tsx#L237) and [apps/customer/src/app/(panel)/kampanyalar/actions.ts:84](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/apps/customer/src/app/(panel)/kampanyalar/actions.ts#L84). Local draft keys include org and creative, reducing cross-org collisions, but browser persistence is not database durability. Existing source guards are positive code findings, not substitute E2E evidence.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**P1 migration delivery dependency**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
