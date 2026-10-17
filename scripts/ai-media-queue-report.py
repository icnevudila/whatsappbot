"""Build evidence-bounded queue audit reports from the recorded local run."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'artifacts/ai-media-queue-2026-10-17'
REPORTS = ROOT / 'docs/ai-media-queue-2026-10-17'
REPORTS.mkdir(parents=True, exist_ok=True)
matrix = json.loads((EVIDENCE / 'matrix.json').read_text(encoding='utf-8'))
# Node assertion TAP emits space-only lines. Keep content, remove whitespace
# from blank lines for a clean review diff. Hash text with portable LF endings.
for tap in EVIDENCE.glob('*.tap'):
    lines = tap.read_text(encoding='utf-8').splitlines()
    tap.write_text('\n'.join(line if line.strip() else '' for line in lines) + '\n', encoding='utf-8')
for log in EVIDENCE.glob('*.log'):
    content = log.read_text(encoding='utf-8')
    log.write_text(content.rstrip() + '\n' if content.strip() else '', encoding='utf-8')

def write(name, content):
    (REPORTS / name).write_text(content.strip() + '\n', encoding='utf-8')

common = """
Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. The initial simulation phase performed no production deploy, migration, restart or paid generation.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.
"""
write('AI_MEDIA_QUEUE_ARCHITECTURE.md', '# AI media queue architecture\n' + common + """

## Actual execution paths

| Component | Observed design | Durability / ownership |
|---|---|---|
| Customer image flow | Creative submission -> `public.jobs` / render worker -> Gateway `AdvancedJobQueue` -> browser worker -> upload -> customer persistence | DB render receipt; Gateway private filesystem state; reference receipt; org catalog checks |
| Customer video flow | `video-job-service.ts` -> revisions/assets + `ai_media_jobs` -> submission-ready publication -> AI Media Control orchestrator | Supabase/PostgreSQL canonical states, attempts, events, outputs |
| Video scheduling | `queue.ts` fetch candidates, `studio_lease_job` claims, host resource guard admits heavy work | SQL CAS; new migration atomically owns account + job + audit |
| Video execution | Control provider router -> GFlow internal service -> pinned gflow-cli driver | Per-account semaphore; supervisor distributed account lease; SQLite invocation identity |
| Gateway video API | `VideoJobQueue` admits callbacks separately from Control DB queue | Private `VideoJobPersistence`; submit intent committed before provider callback |
| Output delivery | Provider download -> job/attempt workspace -> validation/finishing -> output records -> creative mirror -> customer preview/download | Hash and technical gates exist; full live chain NOT TESTED |
| Admin monitoring | `/api/canli-takip/ai-media` uses dashboard RPC | Authenticated read model; does not establish worker/provider correctness |

No Redis/BullMQ/RabbitMQ was added. Gateway filesystem queues are single-process queues, not a multi-host job bus. Account leases do not make Gateway job maps globally atomic.

## Verified defects and minimum changes

1. Heartbeat/release RPC error or malformed data returned success. They now return false. Supervisor renewal failure latches account quarantine and blocks new execution, phase changes and tabs. A late old-token response cannot quarantine a newer reservation.
2. Image worker disappearance could requeue the same paid generation. A claimed image now requires reconciliation on release, retaining idempotency identity. This deliberately trades automatic retry availability for avoiding duplicate paid work.
3. A delayed release could mutate a terminal image and clear a worker now serving another job. Only processing jobs may release their lock.
4. Video API returned a fabricated `position * 110` wait. Unknown estimates and unqueued positions are now null. Customer process code already accepts a nullable estimate.
5. `studio_lease_job` protected one job but not two jobs claiming the same account. The migration row-locks `flow_accounts`, checks unresolved leases, commits account/job/audit together, and refuses unavailable accounts. SQL heartbeat cannot revive expired authority.

## Remaining boundaries

The Control fair-share fetch only examines the first ten queued candidates: fairness across a deeper monopolized backlog is unproven. Image sticky routing can also favor one tenant. The configured resource guard default of three heavy jobs is configuration, not measured safe capacity.
An already-running external GFlow/browser operation is not continuously fenced by the new local supervisor quarantine. A lost or hung heartbeat plus account takeover needs a multi-process partition test and provider reconciliation. No claim of exactly-once physical provider execution is made.
""")

rows = []
for r in matrix['reports']:
    label = 'Mixed' if r['mixed'] else {3:'A',5:'B',10:'C'}[r['tenants']]
    rows.append(f"| {label} | {r['tenants']} | {r['accepted']} | {r['completed']} | {r['p50_ms']} | {r['p95_ms']} | {r['elapsed_ms']} | {r['video_peak_concurrency']} |")
write('CONCURRENCY_3_5_10_REPORT.md', '# Concurrency 3 / 5 / 10\n' + common + """

## Gateway mock matrix: PASS within the stated scope

Actual `AdvancedJobQueue` and `VideoJobQueue` classes, private checksummed/fsynced filesystem receipts, synthetic callbacks, one image worker and video concurrency one. Requests are admitted as a burst; duplicate submission is tested. Real provider calls: **0**.

| Level | Tenants | Accepted | Completed | P50 ms | P95 ms | Elapsed ms | Video peak |
|---|---:|---:|---:|---:|---:|---:|---:|
""" + '\n'.join(rows) + """

A/B/C total: 36 logical jobs (18 image + 18 video). Mixed adds six jobs with variation/revision labels. Every level reported zero duplicate callbacks, wrong-org fixture results, lost receipts and final queue depth. Restart reload preserves terminal identity; terminal video resubmission is rejected. These are observations/assertions in this fixture, not production invariant proofs.

Full receipts, queue/claim/generation timestamps, durations, hashes, CPU and RSS are in `matrix.json`. Throughput is `completed * 1000 / elapsed_ms` and describes local fixture execution only. Image attempt_id is null because Gateway image claims do not currently issue an attempt token. Mock account/project identifiers are explicitly synthetic. Image bytes are memory fixtures; video bytes are `.fixture` files, not playable media. QA and customer delivery remain NOT_TESTED/LOCAL_FIXTURE_ONLY. All costs are unknown, never zero-cost provider claims.

## Scope not covered

Supabase multi-client transactions, real tenant provisioning, full variation/revision APIs, browser sessions, reference uploads, Storage, media resolution, video FPS/audio/outro, worker utilization across hosts, physical account contention and actual billing are NOT TESTED by this matrix. The existing Control tests execute its CAS/backpressure helpers; they do not turn this matrix into a full-stack staging result.

Stage 2 is therefore PARTIAL. No real 3/5/10 capacity is certified. No render concurrency increase was applied.
""")
write('WORKER_RECOVERY_REPORT.md', '# Worker recovery report\n' + common + """

| Failure | Evidence and scope | Status |
|---|---|---|
| Gateway restart / image worker crash | Child process exits 23 after durable claim; new queue reads identity and never reclaims for generation | PASS local process fixture |
| Video process crash | Child exits after submit-intent persistence; restart returns reconciliation_required | PASS local process fixture |
| Timeout / worker returns idle | Claimed image release retains original identity and never requeues automatically | PASS local unit |
| Receipt DB/disk unavailable | Video callback completes, receipt save fails; API fails closed; restart holds original attempt | PASS local injected filesystem failure |
| SQL audit failure | Actual PL/pgSQL in embedded PostgreSQL rolls back job and account | PASS local embedded PostgreSQL |
| Same job delivered twice / terminal replay | Duplicate enqueue rejected; delayed image error cannot mutate terminal job | PASS local queue |
| Account heartbeat error or malformed RPC | Lease failure quarantines account; old-token reply does not affect newer reservation | PASS local mocked RPC |
| Expired account lease | SQL heartbeat cannot renew expired authority; simulator rejects old-token release | PASS local SQL/unit |
| Browser session closed / account chooser | Existing session-recovery helper repairs matching profile once; non-auth/provider/credit failures do not auto-retry | PASS mocked helper only |
| Flow UI change / reference upload / provider timeout | No new real failure injection | NOT TESTED |
| Download / Storage upload outage | Workspace and output gates covered by existing helpers; no network outage injected | NOT TESTED end to end |
| Customer refresh/navigation / cancellation | No real customer browser scenario | NOT TESTED |
| Server/container restart | Only isolated child-process exit, never live service restart | NOT TESTED live |
| In-flight operation during DB partition or hung renewal | Quarantine is local and cannot prove external browser stopped before account takeover | NOT TESTED; release blocker |

## Live unresolved work: FAIL production recovery acceptance

`2c443840-ea5f-47d5-bbc6-52a20fdbf8b5` remains ATTACHING_INGREDIENTS, last updated 7 October, with expired lease `2026-10-07T10:29:26Z`. Provider invocation DB records attempt `b99bdffc-81e6-4189-8ba0-123924c1b75e`, account-03, project `fa7611a7-045b-45fd-b1b5-213d273f81b7`, state SUBMISSION_UNCERTAIN. No MP4 or hash output was found in its current provider output tree.

Previously failed `bf166a60-7349-5b79-a486-951d8854edea` is FAILED in Control but still SUBMISSION_UNCERTAIN in provider SQLite, with no output found. Control terminal state does not prove no provider charge. Both were inspected read-only; neither was resubmitted, cancelled, unlocked or marked successful.

Video queued receipts also become reconciliation_required after restart because callback closures cannot be restored from JSON. Jobs are retained, but automatic pending-work recovery is not established. An operator must reconcile the exact project and cost before releasing any held identity. Do not delete state/SQLite or clear leases as a shortcut.
""")
write('FLOW_ACCOUNT_ISOLATION.md', '# Flow account isolation\n' + common + """

Chain: org_id -> job_id -> attempt_id -> worker_id -> account_id -> flow_project_id -> current generation record/output tile -> download -> sha256 -> published Storage object.

Local evidence: supervisor tests cover canonical-account aliases, no fallback to unknown accounts, one account lease, profile/tab ownership and lease loss. Embedded PostgreSQL executes the actual new account-claim function: second job on the same account is rejected; another account can claim; audit failure rolls back both owners; unavailable account cannot be claimed. PGlite serializes queries, so it does not prove multi-connection network race behavior.

GFlow nine Python tests cover durable invocation identity after reopen, foreign org/attempt/account rejection, unique project binding, generation-record identity, progress journal ownership and sanitized provider errors. Existing Control tests cover per-job/attempt workspaces and provider routing. No stale-output fallback was added.

The new migration is unapplied. Live `studio_lease_job` was read directly and lacks account-row locking; live heartbeat can revive an expired token. Account and job ownership must be rolled out together after review, preserving all dirty runtime changes.

Real Flow project/reference/tile/download/Storage lineage is NOT TESTED in this run. Provider records for the two held jobs are in `provider-reconciliation-readonly.log`; both are uncertain and have no found final output. Local heartbeat quarantine does not terminate an already-running remote process and cannot certify partition safety. Resource capacity and provider rules were not bypassed, and no accounts were switched or refreshed live.
""")
write('TENANT_AND_SKU_SAFETY.md', '# Tenant and SKU safety\n' + common + """

**PASS local catalog/query fixtures:** three independent tenant IDs each select Bofe 16L, reject replacement with their own Delta 10L image, reject a foreign tenant's Delta 10L product, and reject a foreign logo. The real `loadVideoCatalogReferences` function executes org/product-filtered lookups against a fixture client. The same tests cover a foreign brand kit and logo-as-product rejection.

Customer isolation/asset/retry suite: 30 passing tests. Gateway 3/5/10 fixtures maintain separate logical org identities and idempotency receipts. Gateway HTTP media-security tests are included in its full suite. Control canonical product/logo-pair tests reject foreign owners, repeated asset IDs and identical hashes; GFlow invocation tests reject foreign ownership and shared project reuse.

These are synthetic tenant records, not three provisioned staging organizations. Brand DNA, prompt grounding, real logo attachment, uploaded product bytes, download folders and Storage ACLs have not been exercised through an authenticated customer session. SHA-256 proves byte identity, not that a generated image visually depicts the selected SKU. Bofe/Delta visual contamination cannot be marked PASS without inspected outputs. No real media was released by this audit.

Automatic technical acceptance is separate from visual acceptance: fixture completion does not establish file format/resolution, reference fidelity or customer delivery. The Control automatic-release policy can treat explicitly non-severe NEEDS_REVIEW as releasable; this existing product policy was left unchanged and must be evaluated against the requested evidence requirements before production GO.
""")
write('AI_CREDIT_RECONCILIATION.md', '# AI credit reconciliation\n' + common + """

**NOT RECONCILED. No new paid provider generation.** No new billing reservation or ledger was invented. Mock provider callbacks have no real cost; recorded credit_consumption is null. Real estimated cost and provider actual usage must remain distinct.

Live `flow_account_events` query returned four CREDIT_BALANCE_SYNCED events with before/after balances. A balance sync is not per-job usage attribution, settlement, invoice reconciliation, double-charge evidence or proof a failed generation cost zero. The two held invocation identities remain SUBMISSION_UNCERTAIN despite one Control FAILED record. Their provider debit cannot be established from available evidence.

Customer video quota admission currently counts monthly jobs, reads quota, then later inserts a job in separate operations (`video-job-service.ts`). Concurrent last-slot requests may both pass this application check. No atomic reservation guarantee was established. This is a source-level race risk, not a measured double charge. Daily/monthly concurrent quota, cancellation refund, retry settlement and provider reconciliation acceptance remain NOT TESTED.

Local fixes reduce duplicate-submission exposure: retain idempotency on image worker loss, reject terminal replay, fail closed on receipt write failure, atomically own account/job in proposed migration. They do not certify customer balances. Safe next step is read-only reconciliation of the exact held projects against provider usage, followed by a reviewed atomic quota/usage design in the existing DB. Do not launch another paid attempt merely because Control says FAILED or accounts are idle.
""")
write('WIZARD_CONCURRENT_E2E.md', '# Wizard concurrent E2E\n' + common + """

**NOT TESTED — stage gate not satisfied.** This run did not operate a real customer Wizard or submit production browser requests. Gateway-only fixtures do not establish full-stack staging acceptance. Existing unresolved paid identities, live source drift and missing cost attribution prevent advancement to real provider and customer-delivery acceptance.

| Customer scenario | Current evidence |
|---|---|
| Login / company / product / Wizard options | NOT TESTED browser |
| Image + video submission across three organizations | PASS Gateway fixture only; NOT TESTED Wizard |
| Actual variation / revision UI | NOT TESTED; mixed fixture labels are not these APIs |
| Queue status / no fabricated estimate | Local API regression PASS; browser display NOT TESTED |
| Refresh / navigate away and back | NOT TESTED |
| Completion notification / preview / download | NOT TESTED |
| Error / retry / cancellation | Local helpers only; NOT TESTED browser |
| `/canli-takip/ai-media` accurate stuck-job visibility | Source inspected, NOT TESTED browser |

The monitoring endpoint ignores active jobs older than 15 minutes in its active KPI and omits some processing states. It must not be used as proof there are no orphaned jobs: direct DB inspection found a ten-day-old active job. No customer UI or prompt/design modes were changed.

Resume after full-stack staging and cost gates: use actual panel options (no required prepared campaign), verify tenant identity at each step, submit once, refresh/navigate while queued, correlate job/attempt IDs, inspect final media, download and hash it, then verify exact Storage and billing records. Start with bounded provider capacity; admitting ten clients must not launch ten concurrent renders.
""")
write('FINAL_AI_MEDIA_CAPACITY_REPORT.md', '# Final AI media capacity report\n' + common + """

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
""")

followup = REPORTS / 'REAL_PROVIDER_ACCEPTANCE.md'
if followup.exists():
    for report in REPORTS.glob('*.md'):
        if report == followup:
            continue
        with report.open('a', encoding='utf-8') as stream:
            stream.write('\n## Authorized real-provider follow-up\n\n'
                'The results above describe the initial simulation audit. '
                'Subsequent authorized real Wizard canaries, downloads, observed Flow balances and the failed video '
                'are documented in [REAL_PROVIDER_ACCEPTANCE.md](REAL_PROVIDER_ACCEPTANCE.md). '
                'That follow-up supersedes NOT TESTED statements only for the exact scenarios it verified. '
                'Its Gateway suite passes 169/169 locally; production acceptance remains NO-GO.\n')

manifest = {'algorithm':'SHA-256','normalization':'CRLF to LF for portable text verification',
    'scope':'reports, evidence and changed runtime/migration source', 'files':{}}
sources = [ROOT / p for p in [
    'services/omnistudio/gateway/server.js',
    'services/omnistudio/gateway/browser_worker_supervisor.js',
    'services/omnistudio/gateway/distributed_lease_store.js',
    'supabase/migrations/20261017074757_ai_media_account_lease_fencing.sql',
]]
for p in sorted(list(REPORTS.glob('*.md')) + [p for p in EVIDENCE.iterdir() if p.is_file() and p.name != 'SHA256_MANIFEST.json'] + sources):
    manifest['files'][p.relative_to(ROOT).as_posix()] = hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest()
(EVIDENCE / 'SHA256_MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n',encoding='utf-8')
print(json.dumps({'reports':len(list(REPORTS.glob('*.md'))),'hashed_files':len(manifest['files'])}))
