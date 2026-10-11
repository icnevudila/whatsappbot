# Monitoring and recovery

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


## Observed coverage

WA readiness has DB/session/job counters; Sentry enabled=false in actual /ready. Control/Flow Docker healthchecks configured. Gateway and Caddy have no Docker healthcheck. Gateway restart policy exists but will not detect a live-but-stuck Node process by itself. No delivered queue/failure/tenant-isolation alert or on-call acknowledgement evidence was collected.

Gateway logs and memory lack bounds. Root disk has 23 GiB available /69% used in the initial snapshot. Host MemAvailable about 1.7 GiB; roughly half of 2 GiB swap used. Idle resource samples are not peak budgets. Existing physical host is 3.72 GiB, while compose WA/Flow maxima are 6/4 GiB. Prevent generation concurrency increases until isolated peak profile and shared-budget admission gate are measured.

## Actual isolated recovery evidence

1,568 terminal queue receipts were restored from private checksummed files. In-flight image restart retained reconciliationRequired and could not silently reassign the request. Provider callbacks were synthetic and no browser was crashed. Real queue backups are not Supabase backups or WhatsApp reconnect proof.

## Proposed alerts and runbook

Poll safe service summaries, worker heartbeats, queue oldest age, state-age thresholds, database failures/pool saturation, disk/inodes, unexpected credit delta and org mismatch. Severity and deadlines must be specified per measured service latency. Queue stuck does not authorize blind retry; reconcile exact job/provider/project receipt and submission state. Test alarm delivery to a configured operator channel without sending customers anything. Restart/recovery only in an isolated environment; retain rollback image, queue volume, auth storage and current job lease epoch.

Missing alert destination and a dedicated staging runtime prevent end-to-end alarm/recovery acceptance. No live container restart, browser stop or worker kill was performed.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
