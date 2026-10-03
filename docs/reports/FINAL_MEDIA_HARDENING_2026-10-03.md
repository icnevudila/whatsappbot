# Final media hardening — 3 October 2026

Authoritative request: attachment 87f2fe6c-5dbe-487b-9704-1a0dd385aa50. Single-owner execution. No new service, no architecture replacement, no brand-name conditionals.

## Safety snapshot

Local and server HEAD: `0985ff384546e216c2c93c53a54938b81c37614c`. Both dirty; unrelated edits preserved. Read-only server snapshot captured at 09:15 UTC in `/tmp/mesajify-production-preflight-20261002.json` (legacy filename). Gateway active/pending: 0/0. AI-control healthy; Flow container healthy. Host memory: 3809 MB total, 1046 MB available; swap 1043 MB used. These are point-in-time observations, not ongoing readiness proof.

Gateway host/runtime source hashes matched at snapshot time. Runtime worker token environment is absent; this does NOT establish missing authentication because a token-file fallback exists. Verify configured authentication without printing secrets before deployment.

## This execution: local changes

- Image-only disposable CDP target per job; persistent WhatsApp/text routing unchanged. Close the image target after completion/failure. Check empty fresh page, exact target and job owner immediately before prompt submit; reject navigation/Canary collision with `CDP_CONVERSATION_SCOPE_MISMATCH`.
- Image decoder requires actual pixels, supported MIME, valid dimensions, SHA-256. Removed untrusted `/tmp` basename fallbacks from asset resolution. Remaining ownership/SSRF/filesystem policy audit is open; do not describe resolver as fully hardened.
- Generation-progress hook and detail view no longer infer provider/render/persistence stages or ETA from elapsed time. Elapsed seconds remain visible; available server video progress remains authoritative.
- Turn detector now returns explicit `ready` and candidate count instead of undefined logging fields. This does not prove improved live latency.
- Queue forensic reader handles serialized durable payloads and verifies checksum when available.

16 focused local tests passed (reference counts, conversation scope, turn ownership, elapsed-time progress); 4 asset tests passed (pixel decode, corrupt bytes, cross-org namespace rejection before network, unconfigured filesystem rejection). The broader verification command also completed successfully: 25 gateway checks, 12 customer identity/recovery checks, 50 AI-control checks, build and customer typecheck. This broader run preceded the last count/asset-policy edits; rerun affected suites before deployment. No deployment or fresh UI production acceptance from this execution yet.

## Vercel production regression proven

Latest production deployment `dpl_AHwtsdWyoDFEkDFaNw2fDESBboeW`, commit `2ef5c2fa98909d01d7580ea7dce12137fe894eeb`, is ERROR. Actual build events report missing `./video-submit-job` and `@/lib/ai/image-output`. Main includes callers but not their untracked dependencies. Last READY production candidate is `dpl_6vnPBJx5uASMJAr5Qf4ZzeByJv4N` at `0985ff384546e216c2c93c53a54938b81c37614c`. Access to Mesajify team is now confirmed; no 403 blocker observed this execution.

Customer local production build completed successfully; dynamic filesystem tracing warned that it could include the whole dirty project. Runtime filesystem calls were explicitly excluded from tracing (public assets remain served via canonical HTTP fallback), and a clean rerun is required. Filesystem paths require operator-configured `MEDIA_ASSET_FILESYSTEM_ROOTS`; arbitrary paths are rejected. HTTP downloads are bounded at 20 MB.

Live CUA read-back confirmed Mesajify org and image wizard. Both semantic click and native click timed out on the same tab; no paid generation was submitted. This is NOT image acceptance PASS. Preserve the user-owned tab, recover browser input before real tests.

## Required remaining gates — not PASS

| Gate | Evidence required |
| --- | --- |
| Canonical resolver | Offline tests for all source kinds, strict ownership, approved filesystem roots, decoding and bounded downloads |
| Required assets | Both image/video wizard and backend reject missing logo/product before endpoint/provider submission |
| Reference chain | Persist expected/resolved/uploaded/composer counts, roles, hashes and ownership end-to-end |
| Composer/submit atomicity | Same target, conversation and job lease throughout attachment and submit; injected-navigation negative tests |
| Real output contract | Real decoded image, dimensions/hash, durable receipt and library record before READY |
| Latency | Actual per-stage timestamps including UI-ready; no invented phase/ETA |
| Worker authentication | All control clients configured consistently; negative unauthenticated requests; no secret logging |
| Safe deployment | Exact-file backups, drift/hash guard, no in-flight jobs, compatible package, read-back and rollback |
| Mesajify image UI | Fresh conversation, 2/2/2/2 refs, IMAGE response, artifact and library/backend/UI READY |
| Second image tenant | Distinct org/assets/conversation/output SHA, zero contamination |
| Two video tenants | Fresh exact Flow project, two refs, one provider submit, 8 sec 720x1280 ffprobe/hash |
| Abrupt restart | Actual submitted job reconciled, provider_submit_count=1, one final output |
| Resource budget | RSS/RAM/swap/OOM readings during serial real tests |

Existing earlier local candidates and historical media are not evidence that these live acceptance gates passed. Do not blindly run historical deploy scripts with stale hash expectations.
