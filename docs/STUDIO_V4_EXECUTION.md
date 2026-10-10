# Mesajify V4 — execution ledger

## Scope and authorization

V4 supersedes the V3 execution plan, retaining all earlier customer requirements: image/video variations, actual Browser Use tests, creative_id campaign handoff with selected media and generated campaign copy, and Use / More sales-focused / Shorten / Friendlier / Regenerate copy controls. Source video remains 8 seconds, followed by subtitles and a 2-second outro for approximately 10 seconds final.

User authorization updated 2026-10-09: "onay falan isteme ... herşeyi düzelt ve test et" explicitly authorizes necessary real paid acceptance and production release without asking again. Run free checks first, then bounded real acceptance using verified canonical records; reconcile unknown outcomes before retrying. Initial acceptance order: Bofe image, Ayvazoğlu image, Usta Döner image, Bofe video, Ayvazoğlu video. Preserve other work and frozen media. Credential changes requiring secure user entry remain a user operation.

## Sprint 1 — baseline and source map (in progress)

Read-only server snapshot (2026-10-09): checkout 5556310def2d851158668f4b71bdf635fc6d1fae. Running images: ai-media-control `outro-logo-1fc79bf`, gflow-engine `integration-diagnostics-9f74b72`, OmniStudio `docker-omnistudio-worker`, WhatsApp `wa-service:local`. Source checkout SHA does not establish each running image's source SHA. WhatsApp /ready reported DB available, one live session, zero pending/stale claims and four successful recorded jobs. This is health evidence, not our acceptance generation/delivery evidence. Flow /health reported patch 2026.10.03.1. AI /health is liveness only.

Single runtime resource sample: OmniStudio 19.11% CPU / 2.102GiB RAM; Flow 0.13% / 117.7MiB; AI control 0.18% / 38.93MiB; WhatsApp 0.20% / 44.4MiB. Disk 49G used of 75G, 24G available, 68%. These are observations, not before/after optimization gains or scale guarantees. Never reinterpret configured 50-session capacity as measured capacity.

Remote references re-fetched on 2026-10-09:

| Reference | SHA |
|---|---|
| origin/main | eae97581b8515d179587ca319f90dde7908a5b68 |
| final-production-integration | 1cdf40d1bf4457f7edf1e35b8cf21e4f1f49f950 |
| candidate/creative-studio-wizard-v2 | 2410fe700830b573ee9ae155b4751640e9537814 |
| experiment/video-physics-qa-isolated | 9b2e19e4b34dc56df6310c16a5e571319219ef03 |
| isolated candidate merge HEAD before V4 edits | a5310ce5f93a86603f4ab0e320523646df03611d |

Vercel read-only inspection: app.mesajify.com deployment dpl_9QdKy8eCvdTh4iQRPwMPbLkuTFpE is READY at eae97581b8515d179587ca319f90dde7908a5b68. READY is deployment evidence, not customer journey acceptance. Main changes since the candidate base cc96038 affect landing components/assets only. No production mutation performed.

| Chain | Source entry points | Verified boundary / remaining proof |
|---|---|---|
| Image | customer icerik/actions.ts → creative/process.ts → creative/prompt.ts → services/omnistudio/gateway | Source and focused tests inspected; fresh provider/storage acceptance absent |
| Video | creative/video-job-service.ts → ai-media-control/routes/jobs.ts → historical-video-director.ts → creative-video-orchestrator/historical-v5 → gflow-engine → PostPro | Legacy engine preserved; fresh V4 RAW/FINAL and customer acceptance pending authorization |
| Campaign | customer kampanyalar wizard/actions → wa-service campaign-runner.ts/job-consumer.ts → session.sendMessage | Real recipient delivery and final-only handoff still require controlled proof |
| Billing | customer api/billing/checkout, webhook, status, portal | Stripe source exists; checkout rejects missing configuration; live subscription/payment NOT_VERIFIED |
| Queue | customer lib/jobs.ts; wa-service job-consumer.ts → wa.claim_jobs | Candidate atomic index tested in embedded PostgreSQL; production migration not applied |
| Operations | ai-media-control/index.ts /health and telemetry routes | /health is process liveness only, not dependency readiness; readiness/security exposure audit pending |

Root workspace includes apps/* and packages/*, not services/*. Service build/install checks must run in the service directory. Root installation alone did not provide ai-media-control's Express/local orchestrator dependency. Service-local npm ci completed; build rerun pending.

## Candidate findings and fixes carried from V3

Fresh authenticated production Browser Use: Ayvazoğlu /icerik/yeni selected canonical Tuğla. Draft UI showed fallback after AI failure; browser warning explicitly reports `Plan request timed out or cancelled (>5s budget)`. Production is still the old 5-second client budget, whereas the merged candidate uses 35 seconds. No fresh image/video submission occurred in this check. Remember the earlier 35-second correction applied to candidate, not current main. Retest deployed candidate before claiming this runtime issue resolved.

- SELECT then INSERT render deduplication was not atomic. Candidate partial unique index plus duplicate reconciliation added. Twelve concurrent PostgreSQL inserts yielded one success and eleven actual 23505 conflicts; different tenants remain independent. This is embedded PostgreSQL proof, not production worker load proof.
- Turkish price parsing and discount consistency now validate before image/video submissions; sales requires supplied price or offer and CTA.
- Planner canonical product is loaded within the active tenant; fallback copy is labelled deterministic rather than AI.
- V3 images publish needs_review, preserving final bytes and requiring explicit customer review with tenant, SHA, MIME and storage readback checks. Processing an existing review image now returns it without generation.
- Video V3 opt-in preserves the exact physical action contract, allowing negative forbidden-action words in that contract. No automated physical analysis is implemented.
- Five visual styles now have actual prompt directives instead of silently falling back to auto.

## Evidence classification

Extended embedded PostgreSQL queue test: 10, 50, 100 and 300 independent tenant groups submitted the same creative twice per tenant. Each stage accepted exactly one row per tenant, rejected the duplicate with actual 23505, and left zero duplicate active groups. Full targeted suite remains 5/5 PASS. This verifies database uniqueness at these counts, not distributed connections, real worker throughput, Flow account capacity or customer load guarantees.

All 29 root-workspace TypeScript checks passed. Channel suites passed 131 tests across 21 groups; contract/mock tests are not live external-channel delivery proof. Candidate pushed at 02debeec20e60264698dad0eb4dc4a142aec7e9a; Vercel preview dpl_CPNELC5eNF4FfbmBGa64snNbVwHT is QUEUED, not live acceptance. Main production remains unchanged by this agent.

Read-only production database preflight via the running AI-control PostgreSQL client returned zero duplicate active creative.render groups. Unique index remains candidate-only; preflight is not evidence it has been applied. Runtime resource usage varies substantially with other active work; do not restart/replace shared workers during that work.

Security finding: an existing local SSH helper in the original checkout contains a plaintext server credential. The value is excluded from this ledger and candidate changes. Tracking/exposure scope and rotation closure require investigation; SECURITY_RELEASE_GATE_CLOSED cannot pass on deletion alone. Do not reuse or publish that credential.

Additional checks: WhatsApp service 54/54 tests PASS; admin/panel/WhatsApp TypeScript checks PASS; both gflow-engine Python test directories total 10/10 PASS. Global workspace TypeScript audit in progress. Candidate logical commits: queue 5c99aa4, physical video contract 5769e2b.

2026-10-09 follow-up checks: customer optimized production build PASS; customer focused regressions rerun 65/65 PASS; ai-media-control build PASS and 69/69 tests PASS; four selected OmniStudio gateway suites 14/14 PASS; gflow-engine tests/ Python suite 7/7 PASS. These are local free checks, not live provider acceptance. The latest queue error propagation change is awaiting its typecheck completion. No deployment yet.

- Customer focused regressions: 65/65 passed before the latest review/style updates; rerun required.
- V3 targeted tests: 5/5 passed, including embedded PostgreSQL uniqueness and receipt review gates.
- Video orchestrator: 143/143 passed. Pixel decision tests use explicitly synthetic PNG and stub observations. Their names/outputs are not real visual acceptance evidence.
- Customer typecheck passed before the latest format-label edit; rerun required.
- Browser Use candidate fixture: supplied headline, CTA, price, previous price, discount and date reached review. Values persisted after step navigation and an HMR reset; authenticated refresh/recovery is not established by this fixture.
- 390×844 and 430×932 candidate review had no horizontal overflow (document widths 380 and 420). Screenshots in docs/evidence/studio-v3-2026-10-09. Fixture is not a real customer or generation test.
- VISUAL_QA=NOT_VERIFIED; AUTOMATED_PHYSICS_QA=NOT_IMPLEMENTED.
- Credential rotation closure, live capacity, delivery, backup restoration and commercial readiness remain NOT_VERIFIED. No production-ready claim.

## Remaining ordered work

Latest user additions: inspect every service; explicitly prove Flow and Gemini reference chips, correct account/model/format, complete generation and downloaded-file identity. Prove ChatGPT image references and the entire Wizard-to-provider campaign/format contract. Provider payload unit tests and source inspection alone cannot satisfy these requirements. No untested item receives PASS.

1. Complete architecture/runtime inventory and safe baseline measurements across customer/admin/panel/landing, billing/quota, workers and storage.
2. Reliability/security: durable recovery, tenant boundaries, provider identity chain, queue leases, credential incident closure evidence.
3. Authenticated Wizard E2E including late responses, missing references, refresh, double-click and failures.
4. Image commercial brief contradictions, exact prompt/source/SHA provenance and durable tenant creative history.
5. Video physical plan, VO, RAW/FINAL and PostPro contracts.
6. Measure before/change/after performance; avoid invented p50/p95 or paid provider load.
7. Library/campaign/WhatsApp integration and operational monitoring.
8. Free regression, failure injection, database/worker/storage integration and 10–300 target load tests with explicitly mock providers.
9. Five separate approved live acceptance runs only after free gates pass.
10. Modular commits, clean candidate, rollback proof, 21 independent V4 QA statuses and release approval plan.

2026-10-09 20:07 UTC heartbeat: candidate preview at SHA 67c4b456f307321dd876c35b294ba8d3209b8a17 is READY (dpl_5Mh15w9DNgpn6zABpJ6CfLdipC2r). Actual Browser Use navigation to its /icerik/yeni redirects to Vercel login because deployment protection requires an authenticated Vercel session. No protection setting was weakened and no bypass was attempted. Candidate authenticated Wizard acceptance remains NOT_VERIFIED; READY does not resolve the production planner timeout. User Vercel sign-in is needed for this browser acceptance path. Independent source/regression work remains available. Latest local queue test commit f349dbe has not been pushed; main production has not been promoted.

## Real Browser Use acceptance — 2026-10-09 follow-up

Vercel connector created an expiring, authorized preview test link without changing project-wide protection. Preview now reaches the normal Mesajify login page; Vercel login is no longer the blocker. No account cookies were copied or authentication disabled. This corrects the prior Vercel-login handoff requirement. Candidate customer authentication remains unavailable in this browser origin.

Authenticated production Ayvazoğlu test: selected canonical Tuğla, IMAGE, 4:5, PRODUCT_INTRO. Edited headline and replaced unsupported quality claims in the draft with the catalog's toptan/perakende, kapıya teslim and 3-day delivery facts. Onay displayed PORTRAIT_4_5 and selected logo plus product (2/2). Submitted once; creative_id 5bdcec9d-147a-472e-8c9b-aca350b07103. Refresh returned the same creative and supplied campaign text. No second submission or retry was made.

Actual generation FAIL: UI and independently read production creative row both report REFERENCE_ATTACHMENT_FAILED: all requested references were not confirmed in the composer. UI preflight selection is not actual provider upload proof. No completed output, SHA, dimensions or visual quality PASS. Worker log contains two-reference upload attempts and an attachment timeout, including a zero-attachment redispatch, but currently lacks enough correlated observations to prove whether DOM detection, input upload or provider rejection caused this exact job. Do not treat this as a diagnosed or repaired provider issue.

Production elapsed counter reset after refresh; candidate source already derives elapsed from productionStartedAt/createdAt, but deployed candidate verification remains pending. Actual failed result at width 390 has documentWidth 390 (no horizontal overflow); screenshot ayvazoglu-real-image-reference-failed-390.jpg. This is one real failed journey, not all browser tests passed.

Added candidate-only structured image_reference_attachment_timeout diagnostic with job/worker ID, expected count, last observed count/readiness, redispatch and elapsed time. It preserves the fail-closed reference gate and adds no provider submission/retry. node --check PASS; reconnect/single-flight suites 11/11 PASS. No remote worker restart or diagnostic deployment yet; root-cause investigation and repair remain OPEN.

2026-10-09 20:22 UTC read-only reconciliation: exact failed creative 5bdcec9d-147a-472e-8c9b-aca350b07103 stores imageJob.id=job_bc93fba5f7a11c33, queuedAt=2026-10-09T20:12:21.512Z, status=failed. This correlates the prior worker log's two-reference upload, zero-composer-attachment redispatch and terminal attachment error to our acceptance job. Crash snapshot capture also failed with WebSocket not open; this alone does not prove that disconnect caused the preceding upload failure. No retry/new paid generation, status mutation or worker restart performed. Diagnostic candidate commit 5752762 is pushed; runtime activation remains NOT_VERIFIED.

Authenticated candidate Browser Use after user login: preview cq5gmgqme /icerik/yeni is reachable in actual Ayvazoğlu account. Canonical Tuğla + IMAGE 4:5 + SALES_OFFER reached final review. User headline edit survived planner completion; review showed the chosen format and brand/product references. Clicking generation with both price and offer empty displayed the required sales-facts error and stayed in wizard; no paid generation submitted. This narrow client validation PASS does not establish provider references, media generation, server gate, or all wizard paths. Evidence candidate-authenticated-sales-gate.jpg. Remaining reference attachment acceptance failure stays OPEN.

Reference upload repair candidate: replaced first-global-file-input selection with a composer-owned, image-compatible chooser that supports the requested reference count, permitting only an unambiguous external chooser when the provider portals its input. Removed duplicated synthetic input/change events (previously dispatched on the first global input even if a different node received the files). Scoped stale-attachment removal to the current composer, preserving other page controls. These are concrete code defects; their contribution to the actual zero-thumbnail failure remains to be verified live. Syntax check PASS; chooser/reconnect/single-flight regressions 15/15 PASS, mock DOM/CDP contracts only.

Production preflight before worker deployment: /app/gateway is bound from /opt/whatsappbot/services/omnistudio/gateway. Current worker SHA-256 8572a048e3eeba8552035450667a2cde77d4514099bc3a958e8776237626068c. Worker chatgpt-1 is BUSY with another job job_e35b67075297cca3; no file replacement, process restart or new paid generation performed during that work. Deploy only after safe idle/drain and exact source preimage validation; retain rollback and preserve unrelated remote edits. New chooser repair is candidate-only, runtime/real acceptance NOT_VERIFIED.

2026-10-10 follow-up: idle-only scoped runtime upload repair applied with exact remote preimage check and backup. Active worker source SHA-256 is 5c68b098bddc67377198d3366059dd6938d222b86ddc7336b59b41870ebf6856; backup preserves 8572a048e3eeba8552035450667a2cde77d4514099bc3a958e8776237626068c. Remote-only unrelated source remains preserved by scoped substitutions. Existing supervisor respawned the image worker. Provider browser required startup; authenticated built-in ensure-ready endpoint returned HTTP 200, IDLE, READY using existing worker credential wrapper (no credential disclosure/permission change).

Actual Browser Use: previously FAILED acceptance creative 5bdcec9d-147a-472e-8c9b-aca350b07103 opened and its Tekrar dene activated exactly once, per user's explicit retry request. UI now shows preparing. Output/reference acceptance remains pending; no PASS. Retry elapsed counter still uses old creation time before a new imageJob queuedAt exists; record as open UI issue.

Requested online progress animation: pinned upstream MIT svg-spinners blocks-scale and pulse-rings-2 assets downloaded from GitHub, original license and commit attribution bundled locally. CreativeProductionVisual uses these local assets, with a static reduced-motion alternative. Candidate integration only; browser/deployment visual verification still pending.

2026-10-10 retry follow-up: read-only database showed original acceptance still pending with no imageJob ID, although its creative.render queue job 445 had status done. Provider warmup via the authenticated ensure-ready service returned HTTP 200, IDLE/READY. Browser refresh resumed observation of the same creative; no second retry was activated.

Found concrete candidate UI retry bug: render observation effect depended only on canManage/id/router, so failed -> pending after explicit retry did not restart observation. Added a semantic shouldObserveRender dependency; pending -> rendering keeps it true and preserves the active poll loop, while failed -> pending starts observation. Added imageAttemptStartedAt on explicit retry and used it for the progress clock until provider queuedAt is available. No synthetic success/state override. Runtime retest of this UI fix remains pending new preview deployment; reference/media acceptance still NOT_VERIFIED.
Retry timer type declaration corrected after initial TypeScript failure; customer TypeScript rerun PASS. UI/provider acceptance remains pending.

2026-10-10 23:40 UTC heartbeat acceptance: actual Browser Use now shows completed image for creative 5bdcec9d-147a-472e-8c9b-aca350b07103. Loaded persistent storage image job_2ae978f7cfaeb199.png has natural dimensions 1122 x 1402; requested 4:5 differs by 0.14 percent rounding. Visible Tuğla, Ayvazoğlu logo, supplied delivery facts and CTA are present. This proves output display for this one retry, not provider-chip receipts or all providers/variants. Original failed job remains a distinct failure.

Actual Kampanyada kullan navigation preserved creative_id and preselected image (Seçili kampanya görseli). Message step preserved the supplied factual text but automatic AI generation FAILS with CHATGPT_API_KEY_MISSING: OMNISTUDIO_GATEWAY_TOKEN unconfigured. Five AI actions therefore remain NOT_VERIFIED; preserved fallback text is not verified generated AI text. Evidence actual-campaign-ai-token-missing.jpg. No campaign published, no further paid generation/retry.

Latest candidate cc51991f8a2bc3b2949651c94de482734f57a549 deployment dpl_G5NhpBmMs4r4vTeN8mJnJnLF2jKp is READY at whatsappbot-customer-hxa30tbdd-mesajify.vercel.app. Previous e9f3b61 deployment ERROR, corrected by timestamp type fix. Actual acceptance above remains on old authenticated cq5gmgqme preview; latest animations/retry effect runtime verification remains open.

2026-10-10 23:55 UTC heartbeat configuration repair: Vercel non-decrypted metadata proves existing OMNISTUDIO_GATEWAY_TOKEN LxGkm3Qq3d51OVJA targeted production only, while gateway URL targets production/preview/development. Updated existing encrypted token target to production + preview through connector without decrypting, copying, printing or replacing its value. Connector returned corrected target. New preview rebuild requested for current cc51991 candidate; live campaign AI retest remains pending rebuilt deployment. Production deployment unchanged.

2026-10-10 00:10 UTC heartbeat: repaired-config preview deployment dpl_Etyx9UrV17UmWAS2TLbopC42GRr3, cc51991, is READY. Browser Use reached normal Mesajify /giris on its new czmhrv3s7 origin through authorized expiring connector access. Existing authenticated cq5gmgqme session does not authenticate this different preview origin. No cookies copied, no authentication disabled. Latest candidate tab retained for customer sign-in; live AI message/actions/animation verification remains NOT_VERIFIED. Free focused campaign handoff, campaign validation and provider-policy regressions 9/9 PASS (stub provider response explicitly, not real AI acceptance).
