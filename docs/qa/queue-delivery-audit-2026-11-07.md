# Media delivery and queue audit — 7 November 2026

Acceptance: **PARTIAL / automatic image delivery verified; live video blocked by Google authentication**. The user approved controlled publication and runtime repair. See the current handoff below; the original investigation below it is historical and is superseded where noted. Other ongoing working-tree changes were preserved.

## Current handoff for the next bot

### Published code and runtime

- Branch: `codex/queue-delivery-2026-11-07`. These five commits are already pushed: `a37b44f`, `92cf9a1`, `04a30ec`, `82e064d`, `9a0393e`.
- Customer production is already deployed and promoted at exact commit `9a0393ea1554d649a655c01d8683206048ea6adc`, deployment `dpl_EWtgaw86o3AYQVRjp1atdmMiMzLC`, URL `https://app.mesajify.com`. Do not describe it as awaiting its first push.
- Vercel team `team_UNmqXUzSoUzCahqinAb2DnVc` / slug `mesajify`; project `prj_oRUuXZjeWVcMSYHR90AgfjprPquh`.
- An isolated release checkout exists at `.codex_runtime/release-customer`, detached at `9a0393e`. The main working tree contains extensive unrelated, unfinished image-quality and landing edits. Do not stage, reset or deploy all of it indiscriminately.
- Oracle host `92.5.30.109`: the actual `ai-media-control` orchestrator was started and fixed, using image `mesajify-ai-media-control:verified-20261107-122650`, host API bind `127.0.0.1:3460`. `boring_dewdney` is the pre-existing telemetry/feed container and was preserved.
- Control is deliberately restricted by `AI_MEDIA_JOB_ALLOWLIST=8aade834-2aed-545b-a77b-e4a91b2b2a55`. Do not remove this restriction or execute historical backlog without reconciliation. Old pending job `d00a2bef-1b75-5f05-ab0e-2bbf3d76e6c8` was not executed.
- Gateway queue/lease code is committed but **not deployed**. The live gateway has no Supabase configuration for the new fail-closed distributed lease path; configure and verify the real lease store before deploying/restarting it.

### Verified user-visible results

1. Campaign AI returned real text; “Mesajı Kullan” populated the campaign form. No campaign was sent.
2. Original image `70aad2d7-d01c-5858-a5f7-b769cbd0df35` / gateway `job_096f78985df51468` required a one-off manual reconciliation. It is a rescued output, not proof of automatic delivery.
3. Second image `dcda9b0c-6b7c-5d51-ac89-2dd95859a566` / gateway `job_e027ff3e5fde3d27` automatically reconciled through normal UI polling after the fix and reload; decoded 1254×1254. No rescue script was used on this image.
4. A NEW “Gösterişli Kampanya” variation was then submitted once through the live UI after deployment: `008489ae-ab36-5dd6-ae62-71b219cd5231`. The browser automatically reached its detail page, showed both versions “Hazır”, and decoded the new image with `complete=true`, `naturalWidth=1254`, `naturalHeight=1254`. This verifies fresh generation and automatic UI delivery for this canary, not every wizard combination.
5. Video canary `8aade834-2aed-545b-a77b-e4a91b2b2a55` progressed through validation, leasing, environment preparation and project opening, then failed on `PROJECT_CREATION_FAILED`: Flow redirected to `https://flow.google.com/about`. No completed video or browser playback was verified. Its UI showed a failure rather than indefinite first-stage waiting.
6. Server account refresh failed authentication for source ports 9222/account-01 and 9223/account-02. For 9225/account-04, the remote browser visibly opened the Google Accounts sign-in screen after “Create with Google Flow”. Correct Google identity/access must be established before another paid video attempt. Do not reuse a password supplied for another service or inject session cookies from chat.

Evidence: `artifacts/queue-audit-2026-11-07/fresh-campaign-auto-delivered.jpg`, `image-auto-reconciled.jpg`, `image-delivered.jpg`, `campaign-ai-applied.jpg`.

### Fixes and validation

- Image uploads are immutable (`upsert:false`), with duplicate-object readback and exact byte/raster verification. This avoids requiring UPDATE permission for insert-only storage policies.
- Existing accepted image receipts can resume failed reconciliation; this polling does not authorize a new provider generation.
- Delivery writes use the server client only after authenticated tenant ownership checks; the processor independently fences the authorized tenant before provider access or writes.
- HTTP database mode no longer advertises direct PostgreSQL `.query` capability. Flow public-landing failures quarantine the account, with current-job ownership fencing.
- Selected suites: gateway 22/22, customer 35/35, control 27/27, total 84 passing local tests. Customer production build and control TypeScript builds passed. This is not evidence of ten real concurrent provider jobs.

### What remains / execution instructions

1. Have the user complete the intended Google account login in the server browser, then verify observed identity, actual Flow project creation and fresh credits/access through the existing account-refresh path. A Chrome window with a PRO badge alone is insufficient. Preserve profile-to-account mapping.
2. Inspect the failed video receipt and provider state before retrying; do not duplicate an uncertain paid generation. Run a controlled video canary, verify tenant-owned persisted output/playback URL, and visibly play it in the customer browser. Then verify reload/recovery and campaign selection.
3. Inspect stale account-04 busy ownership: current job `7235c772-5b2b-59e9-a06e-b6ecef507d16` was already COMPLETED with verified approved output `d974e7b4-c6a8-4d16-aad0-88cfcde546b3`. It has NOT been released here; reconcile by conditional ownership update with audit, never blanket-clear busy accounts.
4. Finish end-to-end queue metadata: the customer video route still returns unknown queue position/capacity. Gateway estimates alone do not implement the requested user ETA. Make queued AI text resumable under backlog. Deploy gateway only after real distributed lease configuration is verified.
5. Perform controlled 1→3→10 mixed-user tests for ownership, duplicate submissions, refresh/disconnect, resource limits, lease-loss/restart recovery and measured ETA accuracy. Keep provider, synthetic and browser evidence separate. Do not mark the full system PASS before these checks.
6. Existing 13 local Lottie stage assets are valid and wired; reflect authoritative stages, never invent progress based only on elapsed time.
7. Before any additional push, inspect the exact diff and preserve the other bot's landing/image-quality changes. Check local/origin/live SHAs and promote only a verified isolated release. Publish this updated report separately if needed.

Rollback references: pre-turn customer deployment `dpl_6HpRdhvSoqa5GQejtdi2sweij2pq` at `c8199ce8deb6733e8e7393574497c55b1d44d790`; stopped prior control containers were preserved. Runtime release scripts/manifests are in ignored `.codex_runtime`; these can contain operational configuration, so review/redact before sharing. No credentials belong in this handoff.

---

## Historical initial investigation (before controlled publication)

## Live browser evidence

- Campaign AI text: a real request in the Ayvazoğlu campaign wizard returned a new suggestion. “Mesajı Kullan” applied the 250-character suggestion to the campaign form. No campaign was sent.
- Image: creative `70aad2d7-d01c-5858-a5f7-b769cbd0df35`, provider job `job_096f78985df51468`, tenant `4a58b0dd-0931-4901-880a-686457d15010`. Provider completed with a real 1254×1254 PNG (2,389,648 bytes), while the deployed panel remained rendering. The existing local `processCreativeGeneration` reconciled that exact accepted job, validated references/bytes, uploaded and read back storage, and persisted ready. Browser reload then displayed the image with `complete=true`, `naturalWidth=1254`, `naturalHeight=1254`. **Manual reconciliation succeeded; automatic live delivery did not pass.** No second generation was submitted.
- Video: job `8aade834-2aed-545b-a77b-e4a91b2b2a55` was accepted and persisted with `video_submission_ready=true`, but remained PENDING with only JOB_CREATED. No video output or playback was verified. Do not resubmit it.
- Video entry also restored an image draft after initially displaying video. Local fix preserves explicit VIDEO entry during hydration; deployed fix remains unverified.

Screenshots: `artifacts/queue-audit-2026-11-07/image-delivered.jpg`, `campaign-ai-applied.jpg`, `video-pending.jpg`.

## Runtime finding

Read-only SSH inspection of the configured Oracle host found `boring_dewdney` using `infra-ai-media-control`, but its command is `["/app/run.cjs"]` and entrypoint `["node"]`. Logs show a telemetry/feed query, not the video orchestrator. The image default command is `["node","dist/index.js"]`. No named ai-media-control systemd service was active. This explains why the expected video consumer was absent; container uptime alone was misleading.

Database read observed two PENDING jobs and no QUEUED jobs (query limited to 1000 rows). Inspect the other pending job and historical provider receipts before starting any general consumer. Do not silently run or retry the historical backlog.

## Local fixes and validation

- Replace gateway video's hardcoded `position * 110` estimate with recent measured service-time p80, actual pending order, active-lane residuals and worker concurrency. Return separate wait/completion seconds. Fewer than five samples, unknown admission/capacity or overdue active work return unknown, not invented seconds. Removed acceptance-response fallbacks that invented position 1 / 110 seconds.
- Production distributed leases fail closed when no real database client is available, instead of silently creating a process-local simulator based on opt-in strictness flags.
- Fix the image reliability test's provider-domain check: the legitimate internal `trycloudflare.com` tunnel was wrongly classified as the external Cloudflare image provider. Exact external host checks retain the intended provider boundary.
- Ten-tenant video-queue test verifies two-lane limit, FIFO start order, one completion per request, tenant-specific results, and drained backlog. Another test verifies a failing job releases its lane while preserving uncertain provider state.
- Gateway focused suite: 22/22 passed. Customer delivery/submission/ETA suite: 28/28 passed. Control scheduler/capacity/submission suite: 21/21 passed. Full customer production build passed. These 71 local results are not ten real concurrent provider generations.
- Existing stage-specific local Lottie assets/player are already wired; 13 animation JSON files passed timeline validation. Animation does not constitute proof of a backend stage.

## Outstanding work before acceptance

1. Controlled launch of the actual video consumer, preserving both pending identities and reconciling old jobs before any paid execution. Verify correct DB/network/mounts, real account leases, resources and runtime source.
2. Diagnose and deploy automatic image reconciliation; one-off rescue is insufficient.
3. Wire authoritative queue metadata from the real scheduler into customer status. The customer video route currently intentionally exposes null queue position and capacity; changing a gateway estimate alone does not implement end-to-end ETA.
4. Make queued AI text requests resumable rather than relying on synchronous HTTP waiting under a long backlog.
5. Verify real video output persisted, tenant-owned and playable in the browser. Then test refresh/recovery and campaign media selection.
6. Run controlled 1→3→10 mixed-user acceptance with duplicate clicks, navigation/disconnect, restart/lease-loss recovery, fair scheduling and observed ETA accuracy. Keep synthetic and provider evidence separate.

Historical approval state: this initial section was written while NO_PUSH_HELD was active. The user subsequently approved controlled publication and testing; the current handoff above records the resulting live changes.
