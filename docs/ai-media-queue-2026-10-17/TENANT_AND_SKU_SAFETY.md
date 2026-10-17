# Tenant and SKU safety

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. No production deploy, migration, restart or paid generation was performed.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.


**PASS local catalog/query fixtures:** three independent tenant IDs each select Bofe 16L, reject replacement with their own Delta 10L image, reject a foreign tenant's Delta 10L product, and reject a foreign logo. The real `loadVideoCatalogReferences` function executes org/product-filtered lookups against a fixture client. The same tests cover a foreign brand kit and logo-as-product rejection.

Customer isolation/asset/retry suite: 30 passing tests. Gateway 3/5/10 fixtures maintain separate logical org identities and idempotency receipts. Gateway HTTP media-security tests are included in its full suite. Control canonical product/logo-pair tests reject foreign owners, repeated asset IDs and identical hashes; GFlow invocation tests reject foreign ownership and shared project reuse.

These are synthetic tenant records, not three provisioned staging organizations. Brand DNA, prompt grounding, real logo attachment, uploaded product bytes, download folders and Storage ACLs have not been exercised through an authenticated customer session. SHA-256 proves byte identity, not that a generated image visually depicts the selected SKU. Bofe/Delta visual contamination cannot be marked PASS without inspected outputs. No real media was released by this audit.

Automatic technical acceptance is separate from visual acceptance: fixture completion does not establish file format/resolution, reference fidelity or customer delivery. The Control automatic-release policy can treat explicitly non-severe NEEDS_REVIEW as releasable; this existing product policy was left unchanged and must be evaluated against the requested evidence requirements before production GO.
