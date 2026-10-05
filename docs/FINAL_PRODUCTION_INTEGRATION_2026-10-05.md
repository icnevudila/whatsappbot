# Final production integration — work in progress

This is an evidence ledger, not an acceptance report. No production readiness claim.

## Current status (latest checkpoint)

User explicitly revoked NO_PUSH_HELD and authorized push/deploy. Gateway fixes are live and pushed (300b4b3). Customer integration is live at c1c31641194679878a648dbe763845e9e086405e, production deployment dpl_GVBJSToCHqS6ExA1FbUJmUGnsRMH. Direct campaign rewrite buttons and AI-heading cleanup are pushed (f7db06d), deployment dpl_4QDiArjLcB9WCFbZ3jqfwn2jd5DQ is still building at this checkpoint. Video service is live on image infra-ai-media-control:integration-3f08f2b, built from the approved baseline plus integration fixes. Earlier sections below are chronological observations, not current acceptance status.

Latest real browser results: Ayvazoğlu Standard 4:5 image b67e5b6f-cef1-4b62-aeab-dfe324547319 rendered after the gateway repair. creative_id campaign handoff resolves its media; automatic AI text and sales-focused rewriting returned actual results after the missing production gateway token was configured. Minimal child ec7eb440-ad45-4293-8cab-02a6c76a9ea0 and new video 0ace342d-a929-5915-adb2-fdea06ac0326 are pending. Full variant coverage, five successful latency samples, independent reference/master bytes and all deployed retests remain outstanding. Overall acceptance INCOMPLETE.

## Verified prerequisites

- Designer baseline commit on origin/main: `5616b9f611e227c0e82ac6fbcad5c00015b794f1`.
- Video baseline commit on origin/main: `f0b97b2f927670f74bceb45659179c4436c915a3`.
- Video backup branch points to `f0b97b2f927670f74bceb45659179c4436c915a3`.
- Annotated video tag object: `c31026059de4c096d809d73764bbf20f6c225f16`; peeled commit matches Video baseline.
- Both baseline manifests read from origin/main. Their smoke-test claims still require independent artifact/runtime verification; no blanket PASS inherited.
- Work branch: `codex/final-production-integration`. Unrelated pre-existing untracked files preserved.

## First traced defect: creative to campaign handoff

Before: detail page sent `gorsel` and `mesaj` query parameters. Campaign page read only `gorsel`; discarded message, initialized videos as images, restored unrelated previous message. Library sent only a media URL. Campaign insert did not retain creative_id.

Local change: ID-based detail/library links, org-scoped ready-content resolver with video approval gate, selected media type/name/message, persisted facts projected into campaign context, creative-scoped drafts, validated creative_id on campaign insert. Message API loads the snapshot by owned creative_id for generation and rewrite. Wizard requests AI message automatically and offers regenerate/retry. Frozen creative compilers unchanged.

Validation so far:

- Customer typecheck passed after handoff and automatic-message changes.
- `campaign-handoff.test.ts`: 2/2 passed (fact retention including sub-brand SKU, multiple contacts; omission of absent facts).
- Combined handoff, frozen campaign-image and video-library regression suites: 11/11 passed.
- Focused lint found six existing state-in-effect errors and one dependency warning in campaign-wizard; must be repaired, not suppressed. Lint of latest additional changes not yet complete.
- New-code browser acceptance: NOT TESTED; local runtime not yet opened, no deployment performed.

## Browser observations

- Browser Use opened authenticated `https://app.mesajify.com/ozet`, Bofe account.
- Opened `/icerik/yeni` and read actual wizard controls.
- Visible image ratios: 1:1, 9:16, 4:5. Objectives: product introduction, sales, campaign, brand, new product. One selectable canonical product shown.
- Live video description still says approximately 8 seconds; final master contract is 10 seconds. Trace UI/source/deployed revision before correction.
- No generation, campaign save or recipient send executed yet.
- Live library has two ready video entries labeled 0:08. Output proxy tries guessed `_finished.mp4` filenames ahead of the persisted filename. This requires a persisted-artifact/SHA/duration audit; neither the label nor fallback proves the actual delivered bytes.
- Local customer Next dev server started on port 3003 (exec session 53631). Local authenticated acceptance still pending.
- UI video descriptions changed locally to 10-second delivered master; raw Veo/compiler timing untouched.

## Remaining required scope — none waived

1. Inventory EVERY customer and shared Team/Panel production wizard/form; UI→state→payload→API→DB→compiler→provider→effect field matrix.
2. Image field propagation, reference pair bytes/SHA validation, parent/sub-brand/SKU identity, frozen engine delivery.
3. Video field propagation through control/orchestrator/gflow/Flow, raw 8s and final 10s persisted separately; customer final-only selection.
4. Independently verify Post-Pro real source/master bytes, ffprobe, resolution, logo, verified captions/CTA/audio and final frames.
5. Real backend progress transitions, no fake countdown/percentages, elapsed time and checks, reload/navigation/session/reconnect/restart recovery.
6. Final artifact DB/storage/tenant links and library/picker/preview/detail/download/reuse refresh behavior.
7. Required real failure cases, safe retries, idempotency and stale output rejection.
8. At least five real image latency traces with P50/P95/MAX and analogous video timing; state small-sample limits.
9. Real cross-brand concurrency with separate job/attempt/project/reference/output identity; zero contamination.
10. creative_id→Kampanyada Kullan with selected image/video, automatic AI message using all verified data, Kullan/sales/short/friendly/regenerate; retain edits after reload; safe pending/error states.
11. OmniStudio-only production message/reply/image routing and Team chat grouping regression; runtime evidence for zero official API requests.
12. Browser Use authenticated desktop/mobile acceptance for EVERY existing image/video variation, revision and retry mode. Record each tested variant and distinguish missing combinations. No fabricated data or PASS.
13. Repair lint, typecheck, relevant meaningful unit/integration/gateway/creative/video/control tests and customer/panel builds.
14. Deployment only within explicit authorization; preserve NO_PUSH_HELD meanwhile. Verify CI and actual customer/Team/Hetzner deployed revisions and fresh browser results.
15. Final per-wizard/per-variant acceptance matrix, defects/root causes/fixes/retests/evidence, latency, gaps and remaining issues. Declare ready only when full requirements are proven.

## Integration checkpoint: 2026-10-05, live Browser Use run

- Baseline re-fetch: origin/main remains `5616b9f611e227c0e82ac6fbcad5c00015b794f1`; NO_PUSH_HELD. Integration working branch: codex/final-production-integration. All unrelated original untracked files preserved.
- Local campaign handoff now resolves creative_id against the authenticated tenant, enforces ready/final approval, retains the canonical SKU/selected kit/commercial snapshot, generates AI campaign text server-side from that snapshot, and persists campaigns.creative_id.
- Corrected campaign hydration/lint issues without suppression; isolated draft keys by tenant and creative; retained drafts on failed submit; malformed/unavailable browser storage is handled; pending AI requests abort when media changes.
- Corrected video publication so polling cannot replace the snapshot or create a ready ghost record. Publication merges onto the existing tenant mirror and must succeed before attempt completion.
- Added immutable attempt-specific raw/final files and strict 8s raw / 10s final / vertical-resolution / distinct-SHA gate. Delivery verifies persisted bytes against stored SHA and size before serving ranges. This is local code verification only; runtime/deployment remains unverified.
- Selected brand-kit references are validated within tenant; video payload retains supplied price/old price/offer/date/delivery and canonical product/company identity. Mandatory 2s outro remains visible and enforced without changing frozen creative compilers.
- Customer typecheck PASS; ai-media-control build PASS; focused campaign/catalog lint PASS. Focused 17-test combined suite PASS, including immutable real temp-file publication, range-byte integrity, tenant/brand references, snapshot facts and SQL publication failure gates. Full repository/build/browser acceptance still pending.
- REAL IMAGE TEST 1: Bofe, 1:1, product introduction, campaign poster, standard quality, balanced text. Creative ID `d0db639d-ed88-4201-a146-c6d643d44cf0`. First attempt FAIL: `CHAT_NAVIGATION_FAILED: target conversation was not ready`. Observed by 89s after submit; not a success latency sample. Retry clicked via actual UI, same creative retained; output remains unverified while processing. Browser refresh recovery test started.
- Actual wizard AI fallback offered unsupported quality/durability claims. Replaced test copy with factual product identity and neutral contact CTA before submitting. Local UI planner fallback now omits fabricated quality, scarcity, discounted pricing and experience claims; frozen image/video compilers untouched. Planner regression test/retest pending.
- No campaign recipient send, push or deploy performed. All unexecuted variants remain NOT TESTED; no global PASS claim.
- Refresh during retry reattached to the same persisted creative, but live elapsed time restarted from page mount. Local detail UI now computes elapsed time from persisted imageJob.queuedAt (fallback creative.created_at), so reload does not restart the displayed clock; customer typecheck passed afterward. Live retest awaits deployment.
- Broader frozen image/V2/video-approval regression run: 18/19 PASS, 1 FAIL. Existing V2 prompt test expects literal `CTA:` and all website contact text, while frozen baseline emits `Order cue:` and selects strongest commercial anchors. Do not silently change the frozen compiler or weaken this evidence; full field/contact contract requires further assessment. Overall validation is not PASS.
- Browser proof saved at docs/evidence/final-integration-2026-10-05/image-retry-pending.jpg. Retry still pending; do not call it successful or compute success latency. Production navigation root cause remains unresolved.
- Verified via Vercel connector that app.mesajify.com aliases production deployment dpl_A4j6Xd4bACyaPtRSX89U9bR1CnHf (READY), exact Git SHA 5616b9f611e227c0e82ac6fbcad5c00015b794f1; origin/main matches. This proves the tested live baseline revision, not the local integration changes. Filtered last-15m Vercel navigation-error logs returned no entries; no inference that gateway errors are absent.
- REAL IMAGE TEST 1 retry eventually produced a rendered Bofe image in authenticated Browser Use; saved screenshot image-standard-ready.jpg. Ready observed 546s after initial submission (includes failed first attempt, retry and observation intervals; cannot treat as clean single-attempt latency). Neutral product headline/body/CTA visibly rendered. This is artifact-render evidence, not independent full reference-receipt/SHA acceptance yet.
- REAL IMAGE TEST 2 minimal variation started through actual detail UI; child creative ebb769b2-b8e1-48ed-9318-ab98d5eb7615 with parent v1 preserved and visible versions list; currently processing.
- Actual live Kampanyada kullan follows legacy gorsel+mesaj query. Media appears selected, but after clicking İleri the message field is EMPTY (0/4096) despite supplied URL message. Confirmed new handoff defect with live-handoff-empty-message.jpg; local creative_id fix remains undeployed and NOT live-retested.
- Neutral AI-planner fallback regression: 2/2 PASS. All objectives omit invented durability/scarcity/discount/experience claims, supplied offer/price retained.

## Latest failure and recovery checkpoint

- Minimal child image ebb769b2-b8e1-48ed-9318-ab98d5eb7615 FAILED: CDP WebSocket disconnected. Provider acceptance is uncertain; no blind retry performed. Local gateway retains the job/tab for reconciliation after submission intent and does not enqueue a duplicate. Gateway HTTP contract suite: 12/12 PASS; session/single-flight/reaper suites: 21/21 PASS. Deployed behavior NOT RETESTED.
- Tenant switch Bofe → Ayvazoğlu changed organization header but retained Bofe product selection. Screenshot: tenant-switch-stale-product.jpg. Reload corrected catalog before video submission. Local tenant-keyed Studio remount and server foreign-product rejection added; no contaminated generation submitted.
- Real Ayvazoğlu video job 5bc15c36-bc83-5145-a6f9-f92dcefc4f20 FAILED. Exact provider/control error unavailable from current customer UI. Screenshot: video-failed.jpg. No 10-second final master produced or accepted in this test.
- Video progress survived browser reload with the same persisted job. Mobile 390×844 had no horizontal overflow; screenshot video-progress-mobile.jpg. Numeric ETA previously inferred from unscoped old history. Local ETA now uses matching tenant/engine and approved final-output history, actual elapsed time, and no invented worker capacity/queue position. Four ETA regressions PASS; live retest pending.
- Video library/campaign picker now retains actual media type and excludes unapproved finals. Campaign AI and creative planner/draft calls carry tenant/customer/conversation metadata to OmniStudio. Provider-policy fixtures 4/4 PASS; zero official API calls in live runtime remains NOT VERIFIED.
- Studio draft restoration lost nested commercial copy and campaign objective. Local adapter now restores price/old price/offer/date/CTA, retains explicitly cleared values, rejects malformed nested values; Studio restores kit, environment, motion, captions, quality, template, density, sector and delivery once per tenant rather than overwriting edits after catalog changes. Synchronous submission guard prevents concurrent double-click requests; durable unknown-response idempotency still requires work.
- Latest combined snapshot/catalog/handoff/delivery/ETA/draft suite: 18/18 PASS. Customer typecheck PASS. ai-media-control full tests previously 69/69 PASS. Customer production build PASS with unresolved optional dotlottie dependency warning. One broader frozen V2 prompt regression remains FAIL as recorded above.
- Existing declared dotlottie package install was interrupted after npm workspace resolution warning. No package manifest or lockfile changed; dependency warning remains open. Do not call build warning-free.
- Latest focused adapter/planner/campaign lint PASS. Restored user copy now marks its independent dirty guards so a late planner response cannot overwrite recovered headline/body/CTA/voiceover. Final customer typecheck after this change PASS; draft restoration regression rerun 3/3 PASS.

## Follow-up checkpoint: variation context and submission identity

- Fresh fetch: origin/main remains 5616b9f611e227c0e82ac6fbcad5c00015b794f1; Video baseline remains its ancestor. Annotated tag and remote backup still peel to f0b97b2f927670f74bceb45659179c4436c915a3. Independent 8s/10s master-byte proof remains outstanding.
- Traced minimal-child CTA loss: server inherited parent products/contacts but omitted CTA, dates, supplied copy and commercial context. Local parent-context projection now inherits absent fact fields, preserves explicit empty/null user changes, and excludes output/job/submission/compiled-direction state. Two regression tests PASS. Parent payload and malformed draft fail closed. Frozen compiler unchanged; live variation retest NOT DONE.
- Studio image/video submission now retains the same request identity across lost-response retry and page reload for an unchanged serialized payload; changed payload gets a new identity, storage is tenant/media scoped, blocked storage has in-memory fallback. Identity is cleared only after authoritative backend acceptance: video job response or image detail displaying matching persisted requestKey. This supports existing server identity lookup; it does not prove server concurrency race freedom. Two identity tests PASS.
- Latest customer typecheck PASS and focused new-helper lint PASS. No commit, push, deploy, campaign save or recipient send performed. Full acceptance remains incomplete.

## Campaign edit checkpoint

- Fresh fetch confirms unchanged approved baseline ancestry/tag/backup. Actual master-byte proof remains open; no production readiness inferred.
- Edit route did not load persisted campaigns.creative_id, and update action did not validate or update the binding. Local edit now resolves the owned ready/final creative only when its URL/type matches the saved campaign; hidden binding survives editing. Update validates tenant ownership plus exact media URL/type and stores the new ID or clears it when detached.
- Automatic first-message generation now runs only on create; opening an existing campaign cannot overwrite its saved edited body with a new AI response.
- Customer typecheck and focused campaign wizard/actions/edit-route lint PASS. No campaign save/send executed. Authenticated live acceptance of this undeployed edit fix remains NOT TESTED. Campaign duplication/idempotent creation and complete field matrix remain pending.

## Baseline artifact evidence gate

- Fresh origin fetch still has Designer SHA 5616b9f611e227c0e82ac6fbcad5c00015b794f1 and Video backup/tag SHA f0b97b2f927670f74bceb45659179c4436c915a3. These references prove repository presence, not the media contract.
- Independently enumerated existing MP4 files, including ignored files, under scratch, outputs_production, test-results and artifacts; computed actual SHA-256 without editing files. None matched the three full final SHA values in the Video manifest, nor the three published raw SHA prefixes. This scoped negative result does not prove files are absent elsewhere or remotely.
- Manifest supplies no source/final artifact paths or full raw hashes. Asked for the approved source/final folder or evidence-report path. ffprobe exists locally and verification can proceed when the exact files are located. Do not regenerate the frozen baseline or infer PASS from manifest claims.
- New production acceptance/generation is held at this prerequisite; existing local integration work remains unpushed and undeployed. Full goal/heartbeat remains unfinished.

## Explicit user restart

- User explicitly authorized continuing after confirming the other baselines were pushed. Fresh origin/main remains approved Designer SHA 5616b9f611e227c0e82ac6fbcad5c00015b794f1, with approved Video ancestor. This restarts integration work; independent artifact verification remains an open acceptance requirement and NO_PUSH_HELD remains in effect.
- Found campaign duplication also dropped creative_id. Local duplication now retains the source binding and validates owned ready/final media URL and type before creating a draft copy. No live campaign duplication or send performed.
- Customer typecheck PASS; nine handoff/variation/draft/submission regression tests PASS. Latest campaign-actions lint process remains pending with no output (session 53444); do not infer PASS. These fixtures do not exercise authenticated campaign cloning; live retest still pending.
- Vercel connector confirms app.mesajify.com still serves READY deployment dpl_A4j6Xd4bACyaPtRSX89U9bR1CnHf at exact approved baseline SHA 5616b9f611e227c0e82ac6fbcad5c00015b794f1. Integration working changes are not deployed.

## Real production tests restarted from customer UI

- Authenticated Browser Use reopened live Studio on Ayvazoğlu. Actual tenant product `tuğla 2` has catalog description: factory wholesale/retail, door delivery within 3 days. No fabricated price/discount submitted.
- Before submission, UI displayed stale Bofe sprayer headline under Ayvazoğlu. Saved ayvaz-stale-bofe-headline.jpg. Corrected headline/body/CTA through actual form before generating; this is a live draft-contamination FAIL, not a passed tenant-isolation test.
- Real standard 4:5 / product showcase / product intro / low text density submitted; creative 98748f68-4641-4bad-b4e3-b86ff4a0dcf5. Actual customer detail shows persisted matching tenant/title and production pending. No acceptance or latency success inferred.
- Second real job submitted concurrently: Designer 9:16 / campaign poster / brand awareness / detailed density, same legitimate SKU and catalog facts. Final ID/output pending. No campaign save/send executed.

### Observed terminal results of these real jobs

- Standard 4:5 creative 98748f68-4641-4bad-b4e3-b86ff4a0dcf5: FAILED in authenticated customer UI with `[CDP Error] WebSocket not open (readyState: 3)`. Saved ayvaz-4x5-cdp-failed.jpg. No successful artifact, no success latency sample.
- Designer 9:16 creative e0f065d5-456a-4240-8f8b-30a1a2d41e04: FAILED with the same error. Saved ayvaz-designer-9x16-cdp-failed.jpg. Failure observed at 378 seconds after click, including observation delay; not exact backend elapsed duration, not success latency.
- Concurrent jobs had distinct creative IDs and matching tenant/title. This is evidence of separate customer records only, not reference/upload/provider/output isolation PASS.
- Refresh kept the same standard creative ID but reset displayed elapsed time to 0. Live refresh timer FAIL; local persisted-start fix remains undeployed.
- Live gateway /health was online and ai_ready=true, with one processing image job and another failed image job carrying the same socket error. Health availability does not prove successful generation or assign gateway IDs to creatives without correlation evidence. No gateway configuration/restart changed.
- Local Studio now persists orgId in drafts and requires both matching orgId and a current-tenant catalog SKU before restoring. Legacy drafts without verifiable ownership show a warning and require preparing copy again; this deliberately avoids replaying contaminated old copy. Two draft-ownership tests PASS; customer typecheck PASS after correcting Notice prop to tone=warn. Live fix retest NOT DONE.
- No blind retry after socket disconnect: provider acceptance unknown. New local gateway reconciliation handling still requires deployment and real retest. Remaining variations remain NOT TESTED; overall acceptance FAIL/incomplete.

## CDP disconnect investigation and concrete repair

- Verified local code's image-observation poll immediately throws when its CDP socket is closed, even after prompt submission; no original-target reconnection existed. This explains escalation from a disconnected observation channel to a customer-visible failure. It does not establish why the deployed Chrome socket closed (browser crash, target closure, service restart or another cause); deployed logs remain required.
- Added a bounded maximum-two reconnection path after submit intent, using only the same target ID and a verified ChatGPT page. Original prompt/baseline remain unchanged; no prompt replay, navigation or asset reupload. Lost/repurposed targets fail closed and flow into existing SUBMISSION_UNCERTAIN reconciliation handling.
- Gateway contract plus reconnect tests: 14/14 PASS. Worker node syntax check PASS. This is a concrete local gateway repair, NOT deployed or real-production-retested. Frozen image/video compilers unchanged.
- The previous hold applied at this checkpoint only; it was superseded by the explicit authorization recorded below.

## Explicit authorization and live gateway repair (08:49 UTC)

- User explicitly authorized fixes, real testing, push and deployment and revoked NO_PUSH_HELD. Heartbeat instructions updated accordingly. Customer integration remains pending deployment; gateway repairs below are live.
- Production logs correlated failed image jobs with canonical reference count 2/2 and repeated socket errors. The supervisor orphan cleanup did not consult the cross-process TabRegistry. Added active-job and canonical-tab exclusions; test uses two independent registry instances reading the same on-disk ownership record.
- Deployed bounded original-target reconnection, uncertain-submission reconciliation and supervisor ownership protection. Preserved remote server environment authentication loader and existing worker rename behavior. Backed up all three existing files before upload; restarted idle server and image worker through their existing entrypoint supervisor, without restarting Chrome.
- Remote SHA256: supervisor `46ce1d060e8374f9f1a571cc36c88420061c8afd0b6be45d77ea532019761249`; worker `8ea6cde2bbfbbc821036c256397a9908727bdd4e53338fafb7a8c6cae53a926f`; server `77d68ce4e69aff9bb3cf344a264171ebb5475553be620484d0f290e8bbc6fe85`.
- Focused gateway contract/reconnection/cross-process ownership tests: 15/15 PASS. This does not prove all production variants.
- Actual Browser Use test after supervisor fix: Ayvazoğlu catalog product tuğla 2, Standard 4:5, product showcase, low density, factual wholesale/retail and 3-day delivery copy, CTA Bilgi Alın. Creative `b67e5b6f-cef1-4b62-aeab-dfe324547319`, gateway `job_8a8a5b5f75c6a4fc`, target `DF328A99EC57F30B1FCDA615C5631285`.
- Runtime reference gate: expected/resolved/uploaded/composer count all 2, attachments ready 08:47:25.489 UTC. Worker detected completed image at 62 seconds, downloaded 1976.1 KB, published output, and customer UI displayed the final image with matching business/product copy. Screenshot `docs/evidence/final-integration-2026-10-05/ayvaz-supervisor-fixed-ready.jpg`.
- This is one successful post-fix real sample. 62 seconds is provider detection time, not click-to-delivery latency. Full latency distribution, independent product/reference SHA validation, every other variant, real video repair and updated creative_id campaign handoff remain open. Overall goal INCOMPLETE.

## Video-only priority and actual production repair (2026-10-05)

The user deferred further image tests to conserve quota and asked to make video work. Push/deploy authority remains explicit. General integration coverage remains incomplete.

- Customer production f7db06df1f802e4899e65429178f71c1a5b77159 is READY on app.mesajify.com. Missing production gateway token was restored from the existing authorized gateway credential without exposing it. Real AI campaign generation and sales/short/friendly/regenerate actions returned actual text; Kullan remains untested.
- Image standard/minimal/premium/bold actually generated; standard/minimal/premium persistent artifact bytes independently fetched/hashed. Their record creation-to-ready intervals were 87.178/154.907/121.497 seconds. Other image coverage is deferred, not PASS.
- Real video 0ace342d-a929-5915-adb2-fdea06ac0326 failed at provider terminal status 4 after 2/2 reference uploads. The provider's precise reason remains unproven. Deployed bounded diagnostic collection (9f74b72); model/prompt/submission remain unchanged.
- New Browser Use product-showcase job 7c8f46f4-95ac-5e4e-a5fd-fc311d746111, provider attempt 70b0a335-3ba8-45ca-8ae5-06928d107999, actually generated/downloaded 3,664,164 bytes. Raw SHA256 354ccfc81bb0a99ecde62cb412d44ef322db9fa0bcb15016012c471262c8ee3d; independent ffprobe 8.000s, 720x1280, audio present.
- First processing failed FINAL_MASTER_DURATION_INVALID: historical execution contract forcibly disabled outro. Commit 3c52f70 preserves historical 8s provider footage/prompt, appends requested 2s outro, and preserves the outro field in the immutable snapshot. Contract/checkpoint tests 2/2 PASS; final master/immutable output tests 2/2 PASS; both TypeScript builds PASS.
- Live service image outro-fix-3c52f70 SHA256 b02dba539b602735b681c4b780200636916d2c6342bf84338df4e0971a2cbb7d deployed with exact existing environment/volumes retained. Retry event explicitly confirms "Resuming verified raw media without a provider submission". Independent ffprobe finished file 10.000s, 720x1280, audio present.
- Publication then failed because production creatives_status_check allowed only pending/rendering/ready/failed. Additive migration 451abce adds needs_review, matching existing customer library/view behavior; applied successfully to production. No approval gates weakened.
- Second processing-only retry completed NEEDS_REVIEW and persisted a ten-second output, SHA256 f38b795de640d48d83ac0a01431cbc6315219314fa56059c2bb7c76a382efbf2. Audio ASR spells the brand as "aywaz oğlu" instead of Ayvazoğlu, so exact dialogue verification requires review; no automatic PASS claimed.
- Outro logo derivative was 440x260, contradicting the existing minimum-520px presentation policy. Commit 1fc79bf fits the canonical mark proportionally onto a transparent 520px-wide canvas, max320px high. Hotpatch deployed and persistent image outro-logo-1fc79bf built. Final processing-only retry is pending at this checkpoint; persistent image switch and browser playback/outro proof remain to be verified.
- Final logo retry 0e57ab77-dd91-45b6-ac41-6c0ff029a487 completed NEEDS_REVIEW without any new provider submission. Latest output 08e7e19f-1231-4a57-b605-909a8644c313; actual immutable file SHA256 9a9c1cb5a394671304e3faccc4604231ed56dd6ec8c695e20d799bf7d9e94812 independently matches DB, ffprobe 10.000s/720x1280/audio. Logo presentation PASS (transparent, 17.3% coverage); ASR exact-dialogue review remains.
- Persistent outro-logo-1fc79bf image SHA256 9f1b8e62054ba79a5f3ecd41de37ea7a2d299f7546bfd9e4056fdee0f2b4038c deployed idle, existing environment and mounts preserved.
- Browser playback was hidden because production ai_media_outputs lacked product_type. Commit 77ddc06 adds the default short-video discriminator with schema reload; applied to production. Fresh authenticated job API now returns latest output, duration10, verifiedtrue, approvedfalse and tenant-only preview URL.
- Real Browser Use play control succeeded: HTMLVideoElement duration10, pausedfalse, readyState4, errornull, actual source /api/ai-media/outputs/08e7e19f-1231-4a57-b605-909a8644c313?preview=1. This proves runtime playback, not automatic editorial approval.

## Fresh browser verification (19:43 UTC heartbeat)

- The retained job has additional processing-only attempts completed by subsequent activity; this audit did not submit another generation or overwrite their files.
- Fresh authenticated Browser Use playback of current output c8d6f8b6-ab6e-4d95-931d-3a6bf047a5fb?preview=1 reached currentTime10/duration10 with errornull. Visible final frame is the correct transparent Ayvazoğlu logo on a black outro card. Screenshot video-final-outro-live.jpg saved from the actual customer player.
- Production pipeline and private playback are technically working for this real sample. Editorial approval is still NEEDS_REVIEW; do not claim automatic approval, all video variations, or a proven root cause for the earlier provider terminal-status4 failure. Further image tests remain deferred at user request.
