# Security and Storage audit

Confirmed local corrections:
1. Anonymous Gateway generation returned 202 and entered queue; anonymous image status returned
   200. Common auth now protects production/status/operational routes before any side effect.
   Public health and existing signed-output behavior remain available; worker controls retain
   their separate credential. Existing configured chat and Gateway credentials are both supported.
2. Hardcoded Gateway/media token fallbacks removed. No values are repeated in this report.
3. Monitoring previously had a source-controlled PIN/salt fallback. Both configured secrets are
   now required; unset credentials and empty cookies fail closed, comparison is timing safe.
4. Image receipt download origin and redirect checks prevent forwarding server credentials
   to foreign/local/file URLs; exact SHA/decode still governs publication.
5. Real keyframe provider failure cannot produce a synthetic successful media artifact.

Database ordering correction: the Sep 22 Flow schema had broad authenticated SELECT policies,
but the EXISTING Oct 10 reassert_flow_global_rls migration closes them after table creation.
It is independently exercised by tracked root PGlite tests. An unnecessary new migration
candidate was removed. No migration was applied, and no new migration is required for this finding.

Existing private-creatives bucket migration, storage_path_allowed ownership helper, tenant
output routes and streaming download hashes were inspected/tested locally. Supabase documentation:
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/storage/security/access-control

Limits: live migration history/grants/policies/Storage bucket flags are NOT VERIFIED. The internal
ai-media-control API uses privileged DB access and accepts optional org filters; compose binds
its port to loopback. GFlow has no host binding. No live network isolation or malicious internal
caller test was performed. Do not expose these internal APIs to customer traffic.

Before an approved release: configure real Gateway/worker/monitor secrets; rotate previously
source-controlled credentials through the operator's normal workflow. This audit did not rotate
credentials or weaken any protection. Cross-tenant/adversarial tests remain isolated local tests.
