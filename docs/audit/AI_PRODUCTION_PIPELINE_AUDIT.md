# Production pipeline audit

Baseline: `7a4d7f81a3488cd2cbacfe3352ea979889988fef`; branch: `audit/full-ai-production-hardening`.
Candidate application runs at localhost:3047. Existing live providers are not deployed or restarted.

| Transition | Actual code / independent evidence | Status |
|---|---|---|
| Request → tenant | requireActiveOrg, admin role, owned product/kit lookups | Local contracts PASS; complete live multi-tenant matrix NOT TESTED |
| Brief → planning | ai-media/plan, creative/v2/ai-planner, director/brief-v3 | Local customer/root suites PASS |
| Planning → compiler | creative/prompt, video-compiler-v4, historical-v5 compiler | Orchestrator / compiler contracts PASS |
| Compiler → attachments | processCreativeGeneration, asset-source-resolver; exact expected count | Negative decode/owner/reference tests PASS; fresh physical receipt pending |
| Request → Gateway | submitImageJob, submitVideoWithIntent, real-video-providers | Credential propagation fixed; local HTTP auth PASS |
| Job → worker | AdvancedJobQueue, BrowserWorkerSupervisor, durable stores | Local recovery/idempotency/leases PASS; deployed Gateway SHA NOT VERIFIED |
| Output → validation | byte SHA, decoded image, video release policy / ffprobe contracts | Local negative delivery tests PASS; fresh video NOT TESTED |
| Validation → Storage/DB | tenant key, owned creative publication, approved final output | Local root/PGlite contracts PASS; deployed RLS/Storage configuration NOT VERIFIED |
| DB → panel/download | library eligibility, creative download route, ai-media output route | Existing image actual Browser Use download PASS; new variation pending |

Historical evidence starts with tracked IMAGE_ENGINE_LIVE_ACCEPTANCE.md,
VEO_LIVE_ACCEPTANCE.md and ACCEPTANCE_MATRIX.md. Their Oct 11 reports refer to
an older local acceptance candidate, not proof of this exact merge SHA. The
Oct 13 stabilization document also explicitly retains incomplete provider work.
No historical GO is promoted to current PASS.

Current real acceptance: user reported failed variation `cf621903-931c-5054-a7a4-0058a2afe273`.
After the logo and retry-context fixes, the same owned record submitted exactly
`job_a10e3f021edf1f3c`, expected references 3. Provider status processing; not accepted
until exact receipt, output SHA, decoded pixels, library and browser download pass.

No campaign sends, memberships, unrelated assets or running service configuration were changed.
