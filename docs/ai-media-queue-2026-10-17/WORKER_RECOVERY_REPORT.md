# Worker recovery report

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. The initial simulation phase performed no production deploy, migration, restart or paid generation.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.


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
| In-flight operation during DB partition or hung renewal | `ExecutionLeaseMonitor` in `driver.py` continuously checks lease; failure sends SIGKILL to browser process group and marks SUBMISSION_UNCERTAIN | PASS local integration and unit tests (`test_execution_fencing.py`) |

## Live unresolved work: FAIL production recovery acceptance

`2c443840-ea5f-47d5-bbc6-52a20fdbf8b5` remains ATTACHING_INGREDIENTS, last updated 7 October, with expired lease `2026-10-07T10:29:26Z`. Provider invocation DB records attempt `b99bdffc-81e6-4189-8ba0-123924c1b75e`, account-03, project `fa7611a7-045b-45fd-b1b5-213d273f81b7`, state SUBMISSION_UNCERTAIN. No MP4 or hash output was found in its current provider output tree.

Previously failed `bf166a60-7349-5b79-a486-951d8854edea` is FAILED in Control but still SUBMISSION_UNCERTAIN in provider SQLite, with no output found. Control terminal state does not prove no provider charge. Both were inspected read-only; neither was resubmitted, cancelled, unlocked or marked successful.

Video queued receipts also become reconciliation_required after restart because callback closures cannot be restored from JSON. Jobs are retained, but automatic pending-work recovery is not established. An operator must reconcile the exact project and cost before releasing any held identity. Do not delete state/SQLite or clear leases as a shortcut.

## Authorized real-provider follow-up

The results above describe the initial simulation audit. Subsequent authorized real Wizard canaries, downloads, observed Flow balances and the failed video are documented in [REAL_PROVIDER_ACCEPTANCE.md](REAL_PROVIDER_ACCEPTANCE.md). That follow-up supersedes NOT TESTED statements only for the exact scenarios it verified. Its Gateway suite passes 169/169 locally; production acceptance remains NO-GO.

## Authorized production follow-up

The scoped three-file Gateway patch and account/heartbeat SQL migration have now been applied, with backups and a controlled Gateway-process restart. Real PostgreSQL multi-connection contention and rollback checks passed in isolated tables. The second real Wizard video reached GENERATING, then Flow returned status 4 with no media. See [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md) for current deployment, job identities, evidence, remaining gates and rollback. Earlier sections describe the initial audit phase; production acceptance remains NO-GO.
