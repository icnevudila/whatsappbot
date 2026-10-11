# Sales blocker register

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


| ID | Priority | Evidence | State / closure gate |
|---|---|---|---|
| SEC-01 | P0 | Public live Gateway health returned job bodies | CODE VERIFIED + TESTS PASS (116/116); Live deploy pending |
| SEC-02 | P0 | Code/live source allows unguarded lease upsert and simulated production store | CODE VERIFIED + Fail-closed store implemented & tested; Live deploy pending |
| SEC-03 | P0 | Prior leaked DB/Gateway credentials; revocation evidence absent | OPEN P0 BLOCKER; Operator Dashboard rotation runbook documented |
| SEC-04 | P0 | Live public metadata/audit JSON and code-level anonymous operational event stream | CODE VERIFIED + Authenticated output/stream route guard tested; Live deploy pending |
| SEC-05 | P0 | Image submit/status source lacks general caller authentication | CODE MITIGATED; Internal shared secret guard active; Staging deploy pending |
| CAP-01 | P1 | WhatsApp health probe concurrency bottleneck | RESOLVED IN CODE; Single-flight probe sharing verified for 5/10/20/30/50 callers (63/63 tests PASS) |
| BILL-02 | P1 | Webhook no event-order/replay ledger, unchecked suspension errors | RESOLVED IN CODE; Deduplication ledger & sequence guards tested (3/3 PASS), Customer typecheck PASS |
| ONB-01 | P1 | Synthetic new customer onboarding without live messaging | VERIFIED; Isolated state engine & campaign gatekeeping tests PASS (4/4 PASS) |
| OPS-01 | P1 | Host RAM exhaustion risk under >5 tenants (3.72 GiB host RAM) | DOCUMENTED ARCHITECTURE CONSTRAINT; 3–5 Pilot OK, 10–50 NO-GO without RAM upgrade |

No P0 is closed merely by a local unit test. All local code fixes are unpublished, no main merge and no deployment. No permission request is inferred for code fixes; production actions are explicitly prohibited by the current brief.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
