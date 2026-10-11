# V2 Stripe subscriptions and automatic payment backlog

> User decision: V1 has no Stripe subscriptions or automatic online payment; V2 may introduce them later. Frozen Master SHA: `374c0381d8bd309ccb275e3712533784cc9a044e`; Sales follow-up SHA: `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a`. Original Research SHA remains `73a0fd730c41c2f843794eb05d9762168215b088`. Independent audit branch only; no other bot files, production, real payment, WhatsApp send, credential rotation or customer data changed.

## Decision: NO-GO before future payment activation

| Historical finding | V2 disposition at Sales follow-up SHA | Owner / retest |
|---|---|---|
| BILL-01 old subscription cancellation | Open: route nulls subscription ID | Image Fix; signed obsolete/current deletion through actual route and PG |
| BILL-02 invoice failure status | Corrected in isolated 0f7af78 route/SQL fixture; end-to-end closure pending | Image Fix; real PostgREST, migration upgrade and event replay |
| BILL-03 invoice plan fallback/obsolete paid success | Open | Image Fix; current versioned invoice schema, retained plan and subscription identity |
| BILL-04 unpaid completed Checkout | Open | Image Fix; asynchronous payment and entitlement policy |
| Stripe ledger/RLS and migration delivery | Deferred integration dependencies | Explicit roles/RLS, new additive function migration, concurrent replay/order tests |

Original findings remain in historical reports/JSON and TAP, with their original SHA. V2 additionally inherits all applicable V1 admin/tenant/private-media and recovery gates. Before activation implement a single server-authoritative billing policy, coordinated backend/UI enablement, payment receipt verification and exact migration/API contracts.

V1 is not held until V2 payment features are built; it is held until its own gates pass. Do not infer current deployed billing-off status from this code audit.

## Validation boundaries

8/8 targeted audit tests passed, including deliberate defect reproductions. Actual route/component/action source and actual PL/pgSQL were executed using synthetic keys/tenants, a VM, blocked/spied provider calls, mocked Next/Supabase transports and embedded PostgreSQL. Zero real Stripe/DB requests. Missing-keys success proves only that configuration, not a safe V1 feature gate. Full browser journey, actual PostgREST/Storage, production configuration, real multi-connection PG and restart/restore remain BLOCKED/UNVERIFIED. Prior core evidence remains unchanged: 20 checks passed and 1 full-browser test skipped on each historical snapshot.

[V1 test evidence](evidence/v1-launch-tests.tap); [original findings](evidence/findings.json); [initial/follow-up SHA evidence](evidence/snapshot.json).
