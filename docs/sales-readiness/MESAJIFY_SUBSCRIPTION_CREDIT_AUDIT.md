# Subscription and credit audit

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


## Implemented code vs operational proof

Shared plans: free 1 line/1,000 monthly messages; starter 3/10,000; pro 10/50,000; enterprise 50/500,000. This dictionary defines limits, not verified pricing, active billing or actual delivery capacity. Stripe checkout/portal/status/webhook routes exist. Secret presence and Stripe TEST mode/price/product/webhook configuration have not been verified; no real billing action occurred.

Webhook verifies signatures and applies subscriptions via service-role-only SQL RPC. It clears/suspends org according to status. Observed source lacks a persisted event-id ledger/order guard; late signed events could overwrite more recent entitlement state. Suspension updates ignore DB update errors. Treat replay/out-of-order and partial persistence as P1 until sandbox reproduction and a transactional fix.

Video quota code counts ready/processing/pending creatives for the month, default 3. Count/query errors are not rejected before fallback zero/default. It is not an atomic per-job reserve/consume/refund ledger and has no proof of concurrent reservation correctness or cost allocation. That file belongs to the Wizard/creative pipeline; do not alter it during another bot's work. Existing UI's unlimited image statement requires verified commercial limits.

Required sandbox cases: duplicate request/webhook, delayed success after failure, reserve once, terminal success consume once, definite failure refund once, uncertain provider result hold reservation, subscription suspension, cancellation/downgrade and shared-org access. No free trial duration, actual prices, image credit ledger or refund SLA is accepted as implemented without evidence. Unit cost and gross margin UNKNOWN.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
