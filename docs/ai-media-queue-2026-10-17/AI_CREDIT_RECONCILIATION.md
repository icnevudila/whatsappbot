# AI credit reconciliation

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. The initial simulation phase performed no production deploy, migration, restart or paid generation.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.


**NOT RECONCILED. No new paid provider generation.** No new billing reservation or ledger was invented. Mock provider callbacks have no real cost; recorded credit_consumption is null. Real estimated cost and provider actual usage must remain distinct.

Live `flow_account_events` query returned four CREDIT_BALANCE_SYNCED events with before/after balances. A balance sync is not per-job usage attribution, settlement, invoice reconciliation, double-charge evidence or proof a failed generation cost zero. The two held invocation identities remain SUBMISSION_UNCERTAIN despite one Control FAILED record. Their provider debit cannot be established from available evidence.

Customer video quota admission currently counts monthly jobs, reads quota, then later inserts a job in separate operations (`video-job-service.ts`). Concurrent last-slot requests may both pass this application check. No atomic reservation guarantee was established. This is a source-level race risk, not a measured double charge. Daily/monthly concurrent quota, cancellation refund, retry settlement and provider reconciliation acceptance remain NOT TESTED.

Local fixes reduce duplicate-submission exposure: retain idempotency on image worker loss, reject terminal replay, fail closed on receipt write failure, atomically own account/job in proposed migration. They do not certify customer balances. Safe next step is read-only reconciliation of the exact held projects against provider usage, followed by a reviewed atomic quota/usage design in the existing DB. Do not launch another paid attempt merely because Control says FAILED or accounts are idle.

## Authorized real-provider follow-up

The results above describe the initial simulation audit. Subsequent authorized real Wizard canaries, downloads, observed Flow balances and the failed video are documented in [REAL_PROVIDER_ACCEPTANCE.md](REAL_PROVIDER_ACCEPTANCE.md). That follow-up supersedes NOT TESTED statements only for the exact scenarios it verified. Its Gateway suite passes 169/169 locally; production acceptance remains NO-GO.

## Authorized production follow-up

The scoped three-file Gateway patch and account/heartbeat SQL migration have now been applied, with backups and a controlled Gateway-process restart. Real PostgreSQL multi-connection contention and rollback checks passed in isolated tables. The second real Wizard video reached GENERATING, then Flow returned status 4 with no media. See [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md) for current deployment, job identities, evidence, remaining gates and rollback. Earlier sections describe the initial audit phase; production acceptance remains NO-GO.
