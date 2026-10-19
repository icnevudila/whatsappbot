# AI media queue architecture

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. The initial simulation phase performed no production deploy, migration, restart or paid generation.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.


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
6. In-flight GFlow/browser operations now have active distributed lease fencing: `ExecutionLeaseMonitor` in `services/gflow-engine/driver.py` continuously monitors the supervisor lease check (`_validate_supervisor_lease`). If the distributed lease is lost, expires or fails renewal, the browser CLI process group is immediately killed (`SIGKILL`) and the job is marked `FLOW_INVOCATION_UNCERTAIN` to prevent rogue unsynchronized generation.
7. Atomic monthly video quota admission is enforced at the database level via `enforce_ai_media_monthly_video_quota` (`supabase/migrations/20261017103715_ai_media_atomic_monthly_video_quota.sql`) using an organization-scoped transactional advisory lock (`pg_advisory_xact_lock`), eliminating the multi-request admission race condition in `video-job-service.ts`.

## Remaining boundaries

The Control fair-share fetch only examines the first ten queued candidates: fairness across a deeper monopolized backlog is unproven. Image sticky routing can also favor one tenant. The configured resource guard default of three heavy jobs is configuration, not measured safe capacity.
External provider status 4 returns (e.g. Flow generating failure) require upstream provider diagnostic settlement. No claim of exactly-once physical provider execution is made without full provider-side callback contracts.

## Authorized real-provider follow-up

The results above describe the initial simulation audit. Subsequent authorized real Wizard canaries, downloads, observed Flow balances and the failed video are documented in [REAL_PROVIDER_ACCEPTANCE.md](REAL_PROVIDER_ACCEPTANCE.md). That follow-up supersedes NOT TESTED statements only for the exact scenarios it verified. Its Gateway suite passes 169/169 locally; production acceptance remains NO-GO.

## Authorized production follow-up

The scoped three-file Gateway patch and account/heartbeat SQL migration have now been applied, with backups and a controlled Gateway-process restart. Real PostgreSQL multi-connection contention and rollback checks passed in isolated tables. The second real Wizard video reached GENERATING, then Flow returned status 4 with no media. See [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md) for current deployment, job identities, evidence, remaining gates and rollback. Earlier sections describe the initial audit phase; production acceptance remains NO-GO.
