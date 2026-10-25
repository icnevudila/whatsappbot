# Flow account isolation

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. The initial simulation phase performed no production deploy, migration, restart or paid generation.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.


Chain: org_id -> job_id -> attempt_id -> worker_id -> account_id -> flow_project_id -> current generation record/output tile -> download -> sha256 -> published Storage object.

Local evidence: supervisor tests cover canonical-account aliases, no fallback to unknown accounts, one account lease, profile/tab ownership and lease loss. Embedded PostgreSQL executes the actual new account-claim function: second job on the same account is rejected; another account can claim; audit failure rolls back both owners; unavailable account cannot be claimed. PGlite serializes queries, so it does not prove multi-connection network race behavior.

GFlow nine Python tests cover durable invocation identity after reopen, foreign org/attempt/account rejection, unique project binding, generation-record identity, progress journal ownership and sanitized provider errors. Existing Control tests cover per-job/attempt workspaces and provider routing. No stale-output fallback was added.

The new migration is unapplied. Live `studio_lease_job` was read directly and lacks account-row locking; live heartbeat can revive an expired token. Account and job ownership must be rolled out together after review, preserving all dirty runtime changes.

Real Flow project/reference/tile/download/Storage lineage is NOT TESTED in this run. Provider records for the two held jobs are in `provider-reconciliation-readonly.log`; both are uncertain and have no found final output. Local heartbeat quarantine does not terminate an already-running remote process and cannot certify partition safety. Resource capacity and provider rules were not bypassed, and no accounts were switched or refreshed live.

## Authorized real-provider follow-up

The results above describe the initial simulation audit. Subsequent authorized real Wizard canaries, downloads, observed Flow balances and the failed video are documented in [REAL_PROVIDER_ACCEPTANCE.md](REAL_PROVIDER_ACCEPTANCE.md). That follow-up supersedes NOT TESTED statements only for the exact scenarios it verified. Its Gateway suite passes 169/169 locally; production acceptance remains NO-GO.

## Authorized production follow-up

The scoped three-file Gateway patch and account/heartbeat SQL migration have now been applied, with backups and a controlled Gateway-process restart. Real PostgreSQL multi-connection contention and rollback checks passed in isolated tables. The second real Wizard video reached GENERATING, then Flow returned status 4 with no media. See [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md) for current deployment, job identities, evidence, remaining gates and rollback. Earlier sections describe the initial audit phase; production acceptance remains NO-GO.
