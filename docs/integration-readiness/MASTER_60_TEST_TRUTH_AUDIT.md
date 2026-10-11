# Master 60 test truth audit

> Independent frozen-snapshot audit. No main merge, production deployment, paid AI generation, real payment, WhatsApp send, credential rotation or customer DB access. Active worktrees were not edited. Fresh browser/customer E2E: **BLOCKED**.

| Role | Remote branch | Frozen SHA |
|---|---|---|
| main | origin/main | `5e79320b86298d472508275c1538beabedea9ebb` |
| master | origin/feat/codex-wizard-real-e2e-v2 | `374c0381d8bd309ccb275e3712533784cc9a044e` |
| sales | origin/codex/sales-readiness | `17b8eb765b408784a7ac11ed4ef3974c7281cc0f` |
| research | origin/feature/creative-dna-research-validation | `73a0fd730c41c2f843794eb05d9762168215b088` |

## Reclassification of historical run run_1791722041981_b2d286

Reported PASS: 60. Independent classification: **34 REAL_BROWSER_E2E-oriented callbacks, 7 UNIT_TEST, 11 STATIC_CODE_CHECK, 8 UNVERIFIED**. REAL_INTEGRATION=0 and MOCK_ONLY=0 within this runner. Browser category identifies use of browser assertions; it does not mean this auditor verified the historical execution or full named acceptance scope.

The committed evidence has no deployed application SHA/build identity. Screenshot artifact paths point to another local worktree. Screenshots named in JSON are not proof of the implementation version or every acceptance condition. Do not run this runner here: it references real tenant IDs and existing media.

## Critical distinctions

- A23 is a shouldObserveRender substring check, not F5 recovery of an in-flight job.
- A19/A20 do not prove server idempotency or two concurrent tabs.
- A40 validates local browser persistence; A43 checks action names, neither proves DB draft insert/reopen on a different device.
- A44 repairs cookies manually, so cannot certify org-switch synchronization.
- A57 never executes the scanner, and the actual scanner has independently reproduced blind spots.
- A48–A52 only check library horizontal overflow; A53 can pass with no matched buttons and runs on the original page.

## All 60 checks

Line ranges refer to [scripts/master_60_acceptance_runner.mjs:34](https://github.com/icnevudila/whatsappbot/blob/374c0381d8bd309ccb275e3712533784cc9a044e/scripts/master_60_acceptance_runner.mjs#L34).

| ID | Historical result | Mechanism | Runner lines | Actual scope / missing assertion |
|---|---|---|---|---|
| A01 | PASS | REAL_BROWSER_E2E | 171-180 | Limited browser assertion; historical result, not independently rerun. |
| A02 | PASS | REAL_BROWSER_E2E | 187-194 | Checks select value; does not assert cookie synchronization. |
| A03 | PASS | REAL_BROWSER_E2E | 196-201 | Reload only; no second tab or isolated session. |
| A04 | PASS | REAL_BROWSER_E2E | 203-209 | Limited browser assertion; historical result, not independently rerun. |
| A05 | PASS | REAL_BROWSER_E2E | 214-217 | Limited browser assertion; historical result, not independently rerun. |
| A06 | PASS | REAL_BROWSER_E2E | 219-224 | Existing logo label can pass; missing-logo rejection not exercised. |
| A07 | PASS | REAL_BROWSER_E2E | 226-229 | Product heading only; invalid/missing reference rejection not exercised. |
| A08 | PASS | REAL_BROWSER_E2E | 231-239 | Button existence only; no disabled/precondition assertions. |
| A09 | PASS | REAL_BROWSER_E2E | 241-244 | Any matching button suffices; all aspect ratios not selected. |
| A10 | PASS | REAL_BROWSER_E2E | 246-249 | Tab existence only; no generated 9:16 output. |
| A11 | PASS | UNVERIFIED | 254-261 | Optional branch can do nothing; no fallback assertion. |
| A12 | PASS | UNVERIFIED | 263-269 | Optional input fill; no delayed AI race or retained-value assertion. |
| A13 | PASS | UNIT_TEST | 271-276 | Limited browser assertion; historical result, not independently rerun. |
| A14 | PASS | UNIT_TEST | 278-282 | Limited browser assertion; historical result, not independently rerun. |
| A15 | PASS | UNIT_TEST | 284-291 | Limited browser assertion; historical result, not independently rerun. |
| A16 | PASS | UNIT_TEST | 293-300 | Limited browser assertion; historical result, not independently rerun. |
| A17 | PASS | UNIT_TEST | 302-306 | Limited browser assertion; historical result, not independently rerun. |
| A18 | PASS | UNIT_TEST | 308-312 | Tone registry length and two action names; no five actual rewrites. |
| A19 | PASS | STATIC_CODE_CHECK | 317-321 | Checks a local ref assignment; no two-tab/server duplicate test. |
| A20 | PASS | STATIC_CODE_CHECK | 323-326 | Checks stableSubmissionId substring; no persisted unique job count. |
| A21 | PASS | REAL_BROWSER_E2E | 328-337 | Quota text presence only; no quota enforcement. |
| A22 | PASS | STATIC_CODE_CHECK | 339-342 | Limited browser assertion; historical result, not independently rerun. |
| A23 | PASS | STATIC_CODE_CHECK | 344-348 | shouldObserveRender substring; no pending-job F5 replay. |
| A24 | PASS | STATIC_CODE_CHECK | 350-353 | Rejects conjunction of Math.random and ETA; not actual timing truth. |
| A25 | PASS | REAL_BROWSER_E2E | 358-366 | Limited browser assertion; historical result, not independently rerun. |
| A26 | PASS | REAL_BROWSER_E2E | 368-376 | 206 only; no exact bytes, Content-Range validity or expiry. |
| A27 | PASS | REAL_BROWSER_E2E | 378-386 | Limited browser assertion; historical result, not independently rerun. |
| A28 | PASS | REAL_BROWSER_E2E | 388-393 | Limited browser assertion; historical result, not independently rerun. |
| A29 | PASS | REAL_BROWSER_E2E | 395-402 | Limited browser assertion; historical result, not independently rerun. |
| A30 | PASS | REAL_BROWSER_E2E | 404-413 | Limited browser assertion; historical result, not independently rerun. |
| A31 | PASS | REAL_BROWSER_E2E | 415-427 | Frame time plus screenshot; no original-logo/outro quality assertion. |
| A32 | PASS | REAL_BROWSER_E2E | 429-434 | Limited browser assertion; historical result, not independently rerun. |
| A33 | PASS | REAL_BROWSER_E2E | 436-443 | Fetch source and content-length; not browser download action. |
| A34 | PASS | REAL_BROWSER_E2E | 448-453 | Limited browser assertion; historical result, not independently rerun. |
| A35 | PASS | UNVERIFIED | 455-460 | Logs badge count with no expectation. |
| A36 | PASS | STATIC_CODE_CHECK | 462-466 | Documentation phrase only; not media quality validation. |
| A37 | PASS | REAL_BROWSER_E2E | 470-482 | Limited browser assertion; historical result, not independently rerun. |
| A38 | PASS | UNVERIFIED | 484-488 | Logs URL; no clean URL or creative_id preservation assertion. |
| A39 | PASS | REAL_BROWSER_E2E | 490-499 | Limited browser assertion; historical result, not independently rerun. |
| A40 | PASS | REAL_BROWSER_E2E | 501-510 | Exact local browser text survives reload; database draft save not invoked. |
| A41 | PASS | REAL_BROWSER_E2E | 512-516 | Limited browser assertion; historical result, not independently rerun. |
| A42 | PASS | STATIC_CODE_CHECK | 518-521 | Limited browser assertion; historical result, not independently rerun. |
| A43 | PASS | STATIC_CODE_CHECK | 523-526 | Action name substring; database insert/read-back not executed. |
| A44 | PASS | REAL_BROWSER_E2E | 531-553 | Manually repairs cookie if switch failed, masking synchronization defects. |
| A45 | PASS | REAL_BROWSER_E2E | 555-564 | Brand-word scan can miss arbitrary cross-tenant media. |
| A46 | PASS | REAL_BROWSER_E2E | 566-572 | UI 404 check; direct preview/download/blob negative API tests absent. |
| A47 | PASS | REAL_BROWSER_E2E | 574-580 | Limited browser assertion; historical result, not independently rerun. |
| A48 | PASS | REAL_BROWSER_E2E | 588-609 | Overflow check on library only; swallowed article timeout; not full mobile journey. |
| A49 | PASS | REAL_BROWSER_E2E | 588-609 | Overflow check on library only; swallowed article timeout; not full mobile journey. |
| A50 | PASS | REAL_BROWSER_E2E | 588-609 | Overflow check on library only; swallowed article timeout; not full mobile journey. |
| A51 | PASS | REAL_BROWSER_E2E | 588-609 | Overflow check on library only; swallowed article timeout; not full mobile journey. |
| A52 | PASS | REAL_BROWSER_E2E | 588-609 | Overflow check on library only; swallowed article timeout; not full mobile journey. |
| A53 | PASS | UNVERIFIED | 612-619 | Original desktop page, 40px not 44px; empty selector set passes. |
| A54 | PASS | STATIC_CODE_CHECK | 621-625 | Limited browser assertion; historical result, not independently rerun. |
| A55 | PASS | UNIT_TEST | 630-633 | Limited browser assertion; historical result, not independently rerun. |
| A56 | PASS | STATIC_CODE_CHECK | 635-638 | Limited browser assertion; historical result, not independently rerun. |
| A57 | PASS | STATIC_CODE_CHECK | 640-644 | Reads scanner and checks process.exit(1); scanner never executed. |
| A58 | PASS | UNVERIFIED | 646-650 | Reads source and logs; no send spy/network deny. |
| A59 | PASS | UNVERIFIED | 652-655 | Log only; no payment/network evidence. |
| A60 | PASS | UNVERIFIED | 657-660 | Log only; no paid-provider/network evidence. |

Independent rerun of historical browser claims: **UNVERIFIED/BLOCKED**. Required evidence: isolated seeded app, browser traces, exact code/build SHA, request/DB receipts and assertion-level pass/fail.

## Evidence and scope

21 independent tests: 20 passed, 0 failed, 1 skipped. Passing defect reproductions confirm findings, not product safety. Actual pinned route bodies + embedded PostgreSQL run with mocked Next/auth/PostgREST transports; Gateway module and exact media HTTP handler run locally. Multi-process PostgreSQL, deployed browser, CDN, actual Stripe delivery, Supabase Storage and real workers remain unverified. See [test evidence](evidence/independent-tests.tap), [immutable snapshot](evidence/snapshot.json), [findings](evidence/findings.json), and [tool instructions](../../tests/integration-readiness/README.md).

## Later remote update — separate from original snapshot

Sales advanced to `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a` after the initial capture. Its four changed files are listed in [follow-up metadata](evidence/sales-follow-up.json); Master and Research remain at original SHAs. Follow-up independent run: 20 passed, 0 failed, 1 skipped; [separate TAP](evidence/follow-up-tests.tap). **BILL-02 is corrected in the isolated signed-POST/SQL fixture**: invoice.payment_failed/open now suspends. The initial finding remains historical evidence, not an allegation against this later code. BILL-01 (null cancellation ID), BILL-03 (paid-invoice fallback/obsolete success), BILL-04 (unpaid Checkout) and the other pinned-module reproductions remain. Pairwise merge-tree with later Sales is still clean.

**P1 migration delivery dependency**: the follow-up edits the existing `20261011123000_stripe_webhook_atomic_ledger.sql` file instead of delivering a new migration. An environment that already applied the original migration will not automatically receive the updated function through normal migration history. Owner: Image Fix. Supply an additive replacement-function migration, then retest upgrading an already-migrated fixture as well as a clean install. No deployed migration state was inspected.

Docker engine was unavailable on the independent audit host during a local probe; real multi-connection PostgreSQL/container tests remain BLOCKED. Full seeded browser E2E remains BLOCKED. No service was restarted to obtain it. Final release decision remains **NO-GO**.
