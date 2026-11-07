# Media delivery and queue audit — 7 November 2026

Acceptance: **NOT COMPLETE / live video blocked**. No push, deployment or service restart was performed during this audit. The working tree contains other ongoing work; those changes were preserved.

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

The user's previous NO_PUSH_HELD instruction requires live-release approval. A concrete approval request was presented for controlled runtime repair and publication; absent an answer, no dependent live mutation is authorized.
