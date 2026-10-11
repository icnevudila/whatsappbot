# Pilot to 50 customers plan

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


## Staged gates

1. 3–5 pilot: close/revoke credential leaks; deploy separately authorized audited security fixes; sandbox payment ready; new-empty-org onboarding and tenant denial matrix; safe line lifecycle proof; support owner/runbook; fresh bounded image/video production/storage/playback proof after Wizard freeze.
2. 10–15 growth: real 10 and 30-user staging peaks, account/DB contention, at least multi-tenant job execution, provider cooldown/credit budget and duplicate-cost gates, recovery and operator alert delivery.
3. 30–50 commercial: 30/50 independent orgs with concurrent user distribution, sustained workload and bursts, actual WhatsApp isolated sessions/transport fixtures, measured provider service distributions, verified backup restore including media, operating cost and credit accounting, on-call process.

## Resource/cost decisions

Do not infer required RAM from an idle snapshot or MAX_SESSIONS. Collect peak cgroup RSS/CPU/disk/DB connections at each stage; separate browser-heavy hosts from WA if shared budget/latency fails. Keep per-org admission limits and global bounded provider pools. Acquire more provider capacity only after verifying provider licensing/account limits and cost. Scale database pool or compute only from connection/latency evidence; current 27/60 snapshot is not growth capacity.

## Current numeric answer

Commercially safe verified business capacity: UNKNOWN. Completed full acceptance levels: 0. Observed active WA sessions: 1; registered idle AI workers: 1. None of these numbers establishes safe business capacity. Synthetic matrix covers 50 orgs/100 jobs per kind but proves queue mechanics only. Identify staging project/URL, Stripe sandbox and test identities; preserve another bot's active work and repeat on its finished revision.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
