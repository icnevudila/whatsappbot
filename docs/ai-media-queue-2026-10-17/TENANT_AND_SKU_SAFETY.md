# Tenant and SKU safety

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. The initial simulation phase performed no production deploy, migration, restart or paid generation.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.


**PASS local catalog/query fixtures:** three independent tenant IDs each select Bofe 16L, reject replacement with their own Delta 10L image, reject a foreign tenant's Delta 10L product, and reject a foreign logo. The real `loadVideoCatalogReferences` function executes org/product-filtered lookups against a fixture client. The same tests cover a foreign brand kit and logo-as-product rejection.

Customer isolation/asset/retry suite: 30 passing tests. Gateway 3/5/10 fixtures maintain separate logical org identities and idempotency receipts. Gateway HTTP media-security tests are included in its full suite. Control canonical product/logo-pair tests reject foreign owners, repeated asset IDs and identical hashes; GFlow invocation tests reject foreign ownership and shared project reuse.

These are synthetic tenant records, not three provisioned staging organizations. Brand DNA, prompt grounding, real logo attachment, uploaded product bytes, download folders and Storage ACLs have not been exercised through an authenticated customer session. SHA-256 proves byte identity, not that a generated image visually depicts the selected SKU. Bofe/Delta visual contamination cannot be marked PASS without inspected outputs. No real media was released by this audit.

Automatic technical acceptance is separate from visual acceptance: fixture completion does not establish file format/resolution, reference fidelity or customer delivery. The Control automatic-release policy can treat explicitly non-severe NEEDS_REVIEW as releasable; this existing product policy was left unchanged and must be evaluated against the requested evidence requirements before production GO.

## Authorized real-provider follow-up

The results above describe the initial simulation audit. Subsequent authorized real Wizard canaries, downloads, observed Flow balances and the failed video are documented in [REAL_PROVIDER_ACCEPTANCE.md](REAL_PROVIDER_ACCEPTANCE.md). That follow-up supersedes NOT TESTED statements only for the exact scenarios it verified. Its Gateway suite passes 169/169 locally; production acceptance remains NO-GO.

## Authorized production follow-up

The scoped three-file Gateway patch and account/heartbeat SQL migration have now been applied, with backups and a controlled Gateway-process restart. Real PostgreSQL multi-connection contention and rollback checks passed in isolated tables. The second real Wizard video reached GENERATING, then Flow returned status 4 with no media. See [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md) for current deployment, job identities, evidence, remaining gates and rollback. Earlier sections describe the initial audit phase; production acceptance remains NO-GO.
