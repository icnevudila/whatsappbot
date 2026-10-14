# Tenant and SKU isolation

## Confirmed corrections

- Gateway image idempotency formerly returned an earlier job for the same tenant/request/type
  even when the product prompt or reference changed. Negative test reproduced this; a persisted
  canonical request hash now returns HTTP 409 on conflicting inputs. Exact repeats share one job.
  Old durable jobs lacking that hash require reconciliation, not a second provider submission.
- Saved variation logo paths may be stale. resolveOwnedLogoPath resolves the current asset of
  the exact owned kit; a foreign/missing kit fails closed. Explicit custom logos remain exact.
- retryCreative now passes userId/org/authenticated Supabase client to background execution.
  The actual action test reproduced the missing context before the fix and passes afterward.
- Real keyframes now require tenant identity, hash-check local reference bytes and namespace
  output by tenant. An offline provider cannot return a synthetic successful PNG.
- Image delivery rejects foreign output origins and redirects before forwarding credentials.

## Independent evidence

Customer tests cover owned draft restoration, immutable parent SKU/kit, real product-vs-logo,
asset hash/decode, reference count, and publication/download ownership. Root integration tests
execute the existing late Flow RLS migration in PGlite. Gateway tests cover same display name
across tenants, scoped idempotency, uncertain submission holds, signed-media tenant mismatch.
10/50/100/200/300 tenant stub queue cases complete exact tenant results with zero duplicate jobs.

Real account exposes Mesajify only. Bofe/Ayvazoğlu/Delta live browser isolation and simultaneous
paid provider outputs are NOT TESTED; no memberships or products were manufactured to obtain PASS.
Tenant rows tested in fixtures do not prove live RLS or actual model pixel fidelity.

Reproduce: tracked root test command in FINAL_PRODUCTION_READINESS.md;
`node --test services/omnistudio/gateway/test/*.test.js`;
customer tracked-library test command in the same document.
