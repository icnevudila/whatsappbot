# AI media capacity and costs

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


## Actual observations

Gateway healthy/ready with 1 registered worker(s), queue pending 0, active 0 at capture. Composition defines four workers but current ready capacity cannot be inferred from that declaration. Historical database video states: ATTACHING_INGREDIENTS=1, FAILED=98, NEEDS_REVIEW=24, COMPLETED=64. This mixed historical/test cohort is NOT a fresh production failure rate.

## Capacity model, not a capacity claim

Images and video must have separate measured service-time distributions and eligible account pools. Formula: daily theoretical completions = eligible concurrency × available seconds / observed mean service seconds, reduced by measured failure/recovery/cooldown and quota. No current production sample or verified price/credit schedule was collected, so daily output, unit cost and safe customer count remain UNKNOWN. Subscription cost, human support, VPS/Storage and retry spend must be allocated per org; API-free does not mean zero operating cost.

Real queue tests preserve synthetic org identity, image output hashes, exact job identities and duplicate admission. They do not prove physical product/logo attachments, provider account selection, media storage, library readback or cross-brand visual fidelity. Fresh paid sampling must wait for the other bot's stable candidate and use a bounded explicitly recorded sample. No paid production generation was started here.

## 50-tenant changes required

Atomic account leasing, fail-closed quota reservation ledger per org/job, verified account credit telemetry, bounded queue admission, measured priority/fairness, storage retention, worker-host isolation and load-based concurrency budget. Avoid giving each org a browser process. Measure actual safe pool size on staging rather than treating 50 tenants as 50 simultaneous AI generations.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
