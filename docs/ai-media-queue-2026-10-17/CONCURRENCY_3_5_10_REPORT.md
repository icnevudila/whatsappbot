# Concurrency 3 / 5 / 10

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. The initial simulation phase performed no production deploy, migration, restart or paid generation.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.


## Gateway mock matrix: PASS within the stated scope

Actual `AdvancedJobQueue` and `VideoJobQueue` classes, private checksummed/fsynced filesystem receipts, synthetic callbacks, one image worker and video concurrency one. Requests are admitted as a burst; duplicate submission is tested. Real provider calls: **0**.

| Level | Tenants | Accepted | Completed | P50 ms | P95 ms | Elapsed ms | Video peak |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 3 | 6 | 6 | 125 | 154 | 266 | 1 |
| B | 5 | 10 | 10 | 131 | 203 | 310 | 1 |
| C | 10 | 20 | 20 | 246 | 345 | 562 | 1 |
| Mixed | 3 | 6 | 6 | 83 | 100 | 161 | 1 |

A/B/C total: 36 logical jobs (18 image + 18 video). Mixed adds six jobs with variation/revision labels. Every level reported zero duplicate callbacks, wrong-org fixture results, lost receipts and final queue depth. Restart reload preserves terminal identity; terminal video resubmission is rejected. These are observations/assertions in this fixture, not production invariant proofs.

Full receipts, queue/claim/generation timestamps, durations, hashes, CPU and RSS are in `matrix.json`. Throughput is `completed * 1000 / elapsed_ms` and describes local fixture execution only. Image attempt_id is null because Gateway image claims do not currently issue an attempt token. Mock account/project identifiers are explicitly synthetic. Image bytes are memory fixtures; video bytes are `.fixture` files, not playable media. QA and customer delivery remain NOT_TESTED/LOCAL_FIXTURE_ONLY. All costs are unknown, never zero-cost provider claims.

## Scope not covered

Supabase multi-client transactions, real tenant provisioning, full variation/revision APIs, browser sessions, reference uploads, Storage, media resolution, video FPS/audio/outro, worker utilization across hosts, physical account contention and actual billing are NOT TESTED by this matrix. The existing Control tests execute its CAS/backpressure helpers; they do not turn this matrix into a full-stack staging result.

Stage 2 is therefore PARTIAL. No real 3/5/10 capacity is certified. No render concurrency increase was applied.

## Authorized real-provider follow-up

The results above describe the initial simulation audit. Subsequent authorized real Wizard canaries, downloads, observed Flow balances and the failed video are documented in [REAL_PROVIDER_ACCEPTANCE.md](REAL_PROVIDER_ACCEPTANCE.md). That follow-up supersedes NOT TESTED statements only for the exact scenarios it verified. Its Gateway suite passes 169/169 locally; production acceptance remains NO-GO.

## Authorized production follow-up

The scoped three-file Gateway patch and account/heartbeat SQL migration have now been applied, with backups and a controlled Gateway-process restart. Real PostgreSQL multi-connection contention and rollback checks passed in isolated tables. The second real Wizard video reached GENERATING, then Flow returned status 4 with no media. See [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md) for current deployment, job identities, evidence, remaining gates and rollback. Earlier sections describe the initial audit phase; production acceptance remains NO-GO.
