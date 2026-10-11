# WhatsApp reliability

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


## Current evidence

/ready returns ready=true, degraded=false, tracked=1/live=1, pending=0; eight processed jobs reported successful in this uptime, latest type creative.render. This does not mean eight customer messages or a 50-line stress test. Configured MAX_SESSIONS=50, pool max=2; actual line readiness verified for one session only.

Source delivery.ts treats timeout as uncertain delivery. job-consumer/campaign-runner mark delivery_attempted before send and avoid automatic duplicate retry after submission. Account quotas and provider 463 reach-out locks are present. These are code safeguards, not proof every reconnect/fault scenario passes.

Local WA tests: initial run 54/55 (missing DATABASE_URL), second 54/55 (missing WORKER_ID); isolated final fixture run 55/55. Typecheck initially failed five unsafe indexed accesses in authentication test; optional accesses preserve assertions and final typecheck passes. Fetch is mocked; no WhatsApp recipient received a message. Actual QR expiry, reconnect, multi-line, network interruption, scheduled recipient batches and crash at delivery commit still require isolated transport/DB acceptance.

## Operational policy

Use documented consent, opt-out and suppression lists, review provider account restrictions and distinguish Baileys browser protocol from an approved Business Platform integration. Do not promise unlimited mass messaging or immunity from account blocks. Current policy requirements must be confirmed with [official WhatsApp Business policy](https://business.whatsapp.com/policy); legal/commercial approval is NOT granted by these tests.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
