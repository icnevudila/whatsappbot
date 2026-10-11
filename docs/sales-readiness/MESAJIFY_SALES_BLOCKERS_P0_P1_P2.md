# Sales blocker register

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


| ID | Priority | Evidence | State / closure gate |
|---|---|---|---|
| SEC-01 | P0 | Public live Gateway health returned job bodies | LOCAL FIX + HTTP sentinel tests; deploy/runtime acceptance pending |
| SEC-02 | P0 | Code/live source allows unguarded lease upsert and simulated production store | LOCAL FIX + regression; atomic DB lease and runtime config required |
| SEC-03 | P0 | Prior leaked DB/Gateway credentials; revocation evidence absent | OPEN; security owner rotation/revocation proof required |
| SEC-04 | P0 | Live public metadata/audit JSON and code-level anonymous operational event stream | LOCAL FIX + authenticated/private-output HTTP tests; edge/direct-storage and operator proxy acceptance pending |
| SEC-05 | P0 | Image submit/status source lacks general caller authentication; optional tenant query is not an identity | OPEN; coordinated trusted-server authentication with Wizard owner, no production submission used to test |
| CAP-01 | P1 | No end-to-end staging load; 1 WA line/1 registered idle AI worker observed | OPEN; 3→5→10→30→50 measured acceptance |
| OBS-01 | P1 | No Gateway healthcheck/memory limit/log rotation; WA Sentry false | OPEN; isolated alarms and peak-budget tests required |
| BILL-01 | P1 | No observed atomic AI reserve/consume/refund ledger; count error fallback | OPEN; sandbox concurrency/accounting regression |
| BILL-02 | P1 | Webhook no event-order/replay ledger, unchecked suspension errors | OPEN; sandbox event-order and transactional tests |
| OPS-01 | P1 | DB backup/Storage restore/RTO/RPO unverified | OPEN; dedicated restore environment required |
| REL-01 | P1 | Customer active test branch differs from main; image/source revisions diverge | OPEN; frozen integration candidate and manifest |
| UX-01 | P2 | AI settings claim unlimited/~70s; not verified capacity/SLA | OPEN; commercial wording owner review |

No P0 is closed merely by a local unit test. All local code fixes are unpublished, no main merge and no deployment. No permission request is inferred for code fixes; production actions are explicitly prohibited by the current brief.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
