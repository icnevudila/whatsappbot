# Next task: Image/video progress and creative library UX

User supplied this as the next task after the current real E2E/fixing work. Preserve current work; do not restart it.

Source attachment: b60e6e96-de13-49c0-b31e-e08334c41315, received 2026-10-11.

## Required delivery

- Map displayed progress to actual backend state/events. Unknown progress must remain honestly indeterminate; estimated percentages must be labeled.
- Preserve job identity across reload/navigation/browser close, reconcile uncertain submissions, block duplicate paid submits, and fix stuck loading lifecycles.
- Improve mobile/desktop progress UX, Turkish errors, existing-job check versus new retry, and ready preview.
- Audit library filtering, search, image/video previews/playback/download, final-file identity, archival persistence and campaign handoff.
- Keep technically verified media visible with advisory quality warnings; reject corrupt/missing/foreign-tenant media. Compare previous handoff branch selectively; no blind merge.
- Verify org/job/attempt/worker/output/file/hash/creative/library/campaign identity chain with real browser media evidence.
- Reconcile earlier pending jobs before new paid tests. HTTP 202 is not completion.
- Deliver WIZARD_PROGRESS_REAL_STATE_AUDIT.md, WIZARD_PROGRESS_BEFORE_AFTER.md, CREATIVE_LIBRARY_FULL_E2E.md, IMAGE_VIDEO_OUTPUT_PERSISTENCE.md, MEDIA_JOB_RECOVERY_TESTS.md, LIBRARY_TO_CAMPAIGN_HANDOFF.md, private UI_BROWSER_SCREENSHOTS and FINAL_PROGRESS_LIBRARY_GO_NO_GO.md.
- Include UI_ACTION, API, JOB_ID, BACKEND_STATUS, OUTPUT, LIBRARY_STATE, CAMPAIGN_HANDOFF and actual outcome per test.

## Boundaries

One final batch push only after code/tests/build/regressions/security/sanitized reports. No main merge, production deployment, real customer message sending or live service restart. Preserve working Flow/Veo and ChatGPT engines. The later Flow/Veo film-quality engine is a separate task, not started here.

## Existing evidence to carry forward

Current task already reproduced stale provider/creative status and Strict Mode auto-message startup failure. It reconciled the existing Ayvazoglu completed image and preserved private before/after screenshots. These findings belong in the next task audit, but do not establish the whole next task as completed.
