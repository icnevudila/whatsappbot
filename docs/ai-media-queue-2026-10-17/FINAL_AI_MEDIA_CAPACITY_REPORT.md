# Final AI media capacity report

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. No production deploy, migration, restart or paid generation was performed.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.


## Decision: NO-GO for production acceptance

Local hardening and Gateway mock admission passed. Full-stack staging, real provider delivery, cost settlement and Wizard acceptance did not pass their required gates. Live orphan/uncertain jobs remain unresolved. Production was not changed.

| Required criterion | Verdict / scope |
|---|---|
| 1. All valid requests safely admitted | PASS 36 Gateway mock jobs; full-stack NOT TESTED |
| 2. No lost jobs | PASS fixture receipt retention; live orphan recovery FAIL |
| 3. No duplicate execution | PASS mock callback/idempotency tests; physical provider NOT TESTED |
| 4. Correct tenant delivery | PASS local identity checks; customer delivery NOT TESTED |
| 5. No brand/SKU contamination | PASS local Bofe/Delta query negatives; media fidelity NOT TESTED |
| 6. Crash recovery | PASS isolated child-process uncertainty retention; live stuck job FAIL |
| 7. Provider failures safely handled | Local helper PASS; real failure/partition behavior NOT TESTED |
| 8. Correct cost/usage | NOT RECONCILED; no per-job provider settlement |
| 9. Image + video coexist | PASS Gateway fixture; real shared-host capacity NOT TESTED |
| 10. Panel true status | NOT TESTED browser; monitoring source has stale-job visibility gap |
| 11. Download belongs to exact job | Local fixture/hash and identity tests PASS; customer download NOT TESTED |
| 12. All 3/5/10 levels proven | Gateway mock 36/36 PASS; staging/provider/Wizard levels incomplete |

## Changes ready for review

RPC heartbeat/release fail closed; supervisor quarantines lost renewal; expired SQL heartbeat cannot revive authority; image timeout/crash cannot auto-requeue paid work; delayed terminal releases are ignored; video wait estimate is nullable; proposed SQL transaction owns account + job + audit. Added three-tenant Bofe 16L / Delta 10L negatives, 36-job and mixed fixtures, real child-process crash tests and embedded PostgreSQL tests. No prompt, creative mode, finishing or approved ad-generation logic was changed. No queue service added.

## Validation

Gateway **167/167**, AI Media Control **75/75**, customer isolation/assets/retry **30/30**, GFlow **9/9**. Matrix is included in Gateway total, not additive: 36 main jobs plus 6 labelled mixed jobs. SQL tests are included in Control total. Creative-video-orchestrator build and Control typecheck passed. Earlier dependency-resolution failure was resolved by isolated service `npm ci`; initial regression failures are retained as before/after evidence. These are local tests, not real media approvals.

## Capacity statement

The only measured admission capacity is ten logical tenants / twenty mixed image-video Gateway fixture jobs in one burst. Fixture video concurrency was one; no safe real render concurrency, production P50/P95, worker utilization or paid throughput is certified. Live resource samples varied substantially and used several GiB of swap; one sample is not a controlled capacity test.

## Remaining release gates

1. Reconcile held projects and provider charges; recover the stale Control job without resubmitting an uncertain paid attempt.
2. Review/apply migration and code together through an authorized release, preserving 364 dirty runtime entries and verifying exact file hashes. This audit does not authorize production deployment.
3. Verify multi-connection account claims, in-flight fencing under DB/network partition, queued video restart recovery, deeper-backlog fairness and atomic last-slot quota admission.
4. Run the 36-job matrix through full staging DB/Control/provider stubs, including cancel, reference/upload/download/Storage/DB outages and multi-worker contention.
5. Only then run bounded authorized real-provider canaries, technical/visual/media QA and actual customer Wizard preview/download/billing acceptance. Keep unknown visual checks NEEDS_REVIEW.

The requested infrastructure production acceptance is incomplete. This report is a concrete NO-GO review package, not a claim that every requested scenario was executed.
