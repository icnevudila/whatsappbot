# V1 independent go / no-go — Stripe-free controlled pilot

> User decision: V1 has no Stripe subscriptions or automatic online payment; V2 may introduce them later. Frozen Master SHA: `374c0381d8bd309ccb275e3712533784cc9a044e`; Sales follow-up SHA: `0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a`. Original Research SHA remains `73a0fd730c41c2f843794eb05d9762168215b088`. Independent audit branch only; no other bot files, production, real payment, WhatsApp send, credential rotation or customer data changed.

## Decision: NO-GO

Stripe subscriptions/online payment are not V1 features. BILL-01/02/03/04 are V2 backlog items and do not independently veto a Stripe-free pilot. However **preventing existing Stripe code from operating** is a V1 requirement, and the targeted code tests do not establish that it is disabled.

| Mandatory V1 gate | Evidence/status | Owner |
|---|---|---|
| Checkout/Portal disabled even with retained keys | V1-OFF-01: captured provider attempts; fail | Master + Image Fix |
| Webhook has no package/quota/suspension effects | V1-OFF-02: automatic entitlement RPC invoked; fail | Image Fix |
| Payment UI absent or disabled | V1-UI-01: query alone generates payment success; fail | Master |
| Manual grants server-side and auditable | Identity/SQL guards positive; V1-ENT-01 audit unverified, V1-ENT-02 RPC mismatch | Admin/backend |
| P0 admin authority | SEC-01 default-derived admin token reproduced under absent-secret config; closure/deployment protection unverified | Master/security |
| Tenant isolation | Verifier negatives positive; actual app/API/Storage tenant boundaries and roles not independently proven | Both |
| Private media | MEDIA-02/03/04 and SEC-02 unresolved; signed query/public path/cache/range issues | Both |
| Gateway/preview compatibility | MEDIA-01: actual Master preview -> hardened Gateway gives 502 | Both |
| Real Wizard E2E | Registration/org/assets/generate/progress/F5/two tabs/library/preview/download/draft/reopen: BLOCKED | Master |
| Basic recovery | Owner sidecar survives module reload; app/worker/container restart + pending-job/DB/media restore not proven | Infrastructure |

## GO requirements

Fix owners close the above gates on new pinned SHAs, prove V1-off behavior with synthetic keys still configured, and run a seeded isolated cross-tenant customer journey plus restart/restore. UI hidden alone, missing keys alone, source strings and historical 60/60 cannot establish GO. Manual quotas must remain server-enforced regardless of subscription absence.

No owner branch is patched, no deploy performed and no customer production state claimed. V2 payment migration/testing is not required to unblock V1; V1's independent disable and manual-entitlement controls are.

## Validation boundaries

8/8 targeted audit tests passed, including deliberate defect reproductions. Actual route/component/action source and actual PL/pgSQL were executed using synthetic keys/tenants, a VM, blocked/spied provider calls, mocked Next/Supabase transports and embedded PostgreSQL. Zero real Stripe/DB requests. Missing-keys success proves only that configuration, not a safe V1 feature gate. Full browser journey, actual PostgREST/Storage, production configuration, real multi-connection PG and restart/restore remain BLOCKED/UNVERIFIED. Prior core evidence remains unchanged: 20 checks passed and 1 full-browser test skipped on each historical snapshot.

[V1 test evidence](evidence/v1-launch-tests.tap); [original findings](evidence/findings.json); [initial/follow-up SHA evidence](evidence/snapshot.json).
