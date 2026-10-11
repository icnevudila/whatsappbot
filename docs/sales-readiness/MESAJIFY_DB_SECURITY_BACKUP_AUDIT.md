# Database security and backup audit

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


## Live DB snapshot

PostgreSQL PostgreSQL 17.6 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit; 30/60 connections. Nine queried public tables have RLS enabled; policy counts collected for other tables. This is catalog evidence using a service connection, NOT proof tenant principals are denied cross-org access. organization_members was initially searched under org_members; actual table catalog confirms organization_members policies. Browser media denial and matching-owner positive control are tracked separately.

## P0 security findings

Unauthenticated Gateway /health, /stats and / returned recent job objects including prompts/org data. Actual live /health JSON was observed, then evidence collection changed to store counters only. Local fix removes queue records/worker details and arbitrary canary error text; positive sentinel tests cover all three local HTTP routes. LIVE FIX NOT DEPLOYED.

Live unauthenticated HEAD returned HTTP 200 for audit_security_events.json (41,190 bytes) and historical provider metadata (25,558 bytes). No private response bodies downloaded. Local output extension gate preserves media playback but requires existing worker authentication for metadata/logs. Local /events now requires worker authentication instead of publishing cross-tenant stats/job events. Combined HTTP/security tests 19/19 pass. Any direct Caddy/static-file bypass still needs separate closure; Gateway-only protection is not edge-wide proof. Operator EventSource clients need an authenticated server proxy; never place worker tokens in browser URLs.

Distributed lease RPC failure fell back to unrestricted table upsert, allowing a second host to overwrite an active lease. Missing production DB config silently selected a process-local simulator. Live source has both fallback patterns; container env does not include the inspected Supabase DB keys (private file/dynamic config not exhaustively audited). Local fix rejects production missing store and fails RPC acquisition closed. Atomic-RPC unavailable paths reproduced with fake database, not real live lease takeover. LIVE FIX NOT DEPLOYED.

Old PostgreSQL/Gateway secrets are reported compromised by the brief; revocation/rotation NOT_VERIFIED and remains P0. A local untracked SSH helper also contains a literal credential and uses AutoAddPolicy; it was not executed. Audit uses existing private .env and RejectPolicy, never puts credential values/hashes in reports. Code removal, a clean Git tree or successful login cannot prove old credentials revoked. No rotation performed under this task.

## Backup and privacy

Supabase plan, backup retention, last successful backup, encrypted offsite copies and staging restore RPO/RTO not verified. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups) distinguishes DB backups from stored media binaries. Require independent binary manifests and SHA readback alongside DB/Auth/RLS restore. No production pg_dump or restore was triggered. Durable queue disk reload was tested; this is NOT a PostgreSQL backup restore.

Additional isolated embedded PostgreSQL test used selected actual contacts membership/policy SQL from the historical migration, synthetic auth.uid() and two synthetic tenants. Reads, cross-org updates/inserts and policy behavior after data-directory archive restore passed; [measured archive/restore evidence](evidence/embedded-db-restore.json). This is real embedded Postgres execution but NOT the full Supabase schema/JWT/production backup or RTO. [Browser detail scope check](evidence/browser-scope-check.json) denied Bofe record under Ayvazoğlu and showed the same record under Bofe after reload; one user belongs to both orgs, so no separate-principal security certification.

Signed/public media URL classification, cross-org JWT matrix, role escalation and storage RLS require dedicated identities and staging. [KVKK processing conditions](https://www.kvkk.gov.tr/Icerik/2050/Kisisel-Veriler) and [deletion/retention guidance](https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi) inform an inventory of lawful basis, disclosures, retention, deletion, processor agreements, transfers and rights workflows. Legal compliance NOT_VERIFIED; do not copy institutional retention periods as this product's policy.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
