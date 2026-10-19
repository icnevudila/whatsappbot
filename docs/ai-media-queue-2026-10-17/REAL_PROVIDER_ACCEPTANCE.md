# Real provider / Wizard follow-up — 17 October 2026

This phase follows the user's explicit authorization to run paid tests. It uses the actual locally served customer application, real authenticated Wizard choices, production Gateway/Control, real references and returned media. It is separate from the initial 36-job mock matrix. This first canary phase preceded deployment. The later explicitly authorized deployment and second video canary are documented in [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md). No main merge or paid bulk matrix was performed.

## Measured results

| Test | Exact identity | Result |
|---|---|---|
| Mesajify image | creative `a80011b8-4d01-5b96-af3a-ed8fb14be7e8`, Gateway `job_2979a0b1c3edc513` | Real output delivered and downloaded through the panel; PNG 1254×1254, 1,786,337 bytes |
| Mesajify video | job `3d34e3ab-23c3-5695-a26b-596e2d92748b`, attempt `ff627160-3ffa-42b5-b215-e24fcaeb64b6`, account-04 | FAILED after about 103 seconds, `Cannot find default execution context`; no video returned |
| Bofe Tarım image | creative `ea575cb5-6300-59c4-a695-2315815bcb11`, Gateway `job_2495cad3414a08f6` | Real output delivered and downloaded; PNG 1254×1254, 2,457,844 bytes |
| Ayvazoğlu image | creative `696e94a6-59b7-5024-a768-09b0808d45ba`, Gateway `job_c2091a0811573185` | Real output delivered and downloaded; PNG 1254×1254, 2,162,906 bytes |

Mesajify download SHA-256: `c085fc584ce9b373e3d5397a56e125cbd69a805938dea75d79eaba7e04bf2f32`. Bofe download SHA-256: `421a00ba10127638f232e64ac47d355951c9398f810249950b29d45cc80b0e00`. Ayvazoğlu SHA-256: `f9d9a435044e5897ecb55f3e032ba1a51d488b840ff91cf77712a7ad031a831f`. All three downloaded files match their exact org/creative/job/storage/reference receipts. Each creative has one render-job record. `scripts/verify-real-media-canaries.py` reproduces this comparison from `artifacts/ai-media-real-2026-10-17/final-db-receipts.log`.

Mesajify's receipt binds exact org/creative/job/storage path and reference counts expected/resolved/uploaded/composer = 2/2/2/2, with worker `chatgpt-1` and a job-owned conversation target. The real Bofe Wizard first selected Delta 10L, then Bofe 16L; the final summary and resulting visible product identify Bofe 16L. No image prompt, creative mode or approved finishing policy was changed.

## Browser evidence and limitations

The actual login form, company selector, catalog product, Wizard steps, image submission, preview and download were used. Browser refresh retained the Mesajify creative ID and the video job ID without another submission. The video panel correctly reached a terminal failure rather than displaying SUCCESS. Initial page compilation/hydration required waiting before interacting. Company switching must complete its server action and reload before reading or submitting another tenant's Wizard.

Two authenticated test identities were used; the broader test identity has access to multiple firms and includes admin memberships. This is not proof of three unrelated non-admin customer accounts. A page outside the current organization scope returned 404, rather than delivering another tenant's media. No fixture cookies were injected to bypass company selection.

Technical delivery is separate from visual acceptance. The Mesajify image uses an oversized screen composition, so visual quality remains NEEDS_REVIEW. The Bofe output visibly depicts the blue 16L backpack product rather than Delta 10L; full canonical geometry/branding approval is not claimed merely from a hash. No video playback, ffprobe/audio/outro approval or video download was possible because the canary failed.

## Video failure and credit evidence

The job moved PENDING → VALIDATING_INPUTS → QUEUED → LEASED → PREPARING_ENV → FAILED. The historical director first returned Gateway HTTP 502 and used its existing deterministic fallback; the later terminal error was `Cannot find default execution context`. No GFlow invocation row or provider output folder exists for this canary. This supports a pre-GFlow failure, but does not independently settle every possible provider cost. The failed canary was not resubmitted.

Direct Flow account-details UI showed account-03 **688 credits** and account-04 **920 credits**, substantially different from old database balances. CLI credit inspection against the correctly configured profile home returned an explicit migrated-account `labs.google` API-token incompatibility; it does not prove a logged-out browser. Old uncertain projects remain unresolved: their editor pages remained at Loading and no final media was verified. Current balances cannot allocate historical per-job charges. A later account-04 balance probe did not yield a verified value; no zero-cost claim is made.

## Additional local hardening

Added one bounded readiness re-probe for Chromium navigation-context loss, inside the existing readiness timeout. It does not replay generation, change accounts or restart the browser. Regression tests cover successful recovery, bounded persistent failure, and no retry after execution begins or for AUTH_REQUIRED. Gateway suite: **169/169 PASS locally**. This is a tested mitigation of the observed readiness symptom, not proof of complete provider recovery. It was subsequently deployed with the other scoped queue changes; the next canary passed readiness and reached GENERATING, then failed in Flow.

## Release decision

**NO-GO remains.** The user explicitly authorized the controlled production deploy/restart after this phase. The three scoped Gateway changes and SQL migration are now applied; see [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md). The second video canary reached real Flow generation but returned provider status 4 and no output. Historical per-job credits remain unreconciled. The paid 3/5/10 matrix remains gated by this failed video acceptance, not by missing user permission.
