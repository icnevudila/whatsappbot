# AI media queue architecture

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. No production deploy, migration, restart or paid generation was performed.
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

## Remaining boundaries

The Control fair-share fetch only examines the first ten queued candidates: fairness across a deeper monopolized backlog is unproven. Image sticky routing can also favor one tenant. The configured resource guard default of three heavy jobs is configuration, not measured safe capacity.
An already-running external GFlow/browser operation is not continuously fenced by the new local supervisor quarantine. A lost or hung heartbeat plus account takeover needs a multi-process partition test and provider reconciliation. No claim of exactly-once physical provider execution is made.
