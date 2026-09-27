# LONG_FORM_VIDEO_V1 isolation contract

This document describes the implemented, explicit long-form product boundary.
It is reachable only when a job declares `job_type=LONG_FORM_VIDEO_V1` and
`creative_engine_mode=LONG_FORM_VIDEO_V1`; ordinary short-video jobs do not enter
this path.

## Product boundary

- `SHORT_FORM_VIDEO` remains the existing 6–8 second `SIMPLE_V5_HYBRID` product.
- `LONG_FORM_VIDEO_V1` is a separate product with its own scene orchestration,
  assembly, post-production and provenance metadata.
- Supported production durations are explicitly limited to 24, 32 and 40 seconds.
- No short-form job is implicitly upgraded based on duration; long-form mode must
  be requested explicitly.

## Planned interfaces

The future implementation must introduce, without changing short-form imports:

- `LongFormDirector` → `LongFormPlan`
- `ContinuityContract` (read-only inheritance of the existing product-fidelity contract)
- `LongFormSceneCompiler`
- scene-local orchestrator and retry state
- `LongFormAssembler`
- `LongFormRevision` with `DRAFT → APPROVED → LOCKED`

The root job uses `job_type=LONG_FORM_VIDEO_V1`; its scene attempts retain
`org_id → long_form_job_id → scene_id → attempt_id → provider → account → output →
sha256 → assembly → final_sha256`. Existing short-form job types and transitions
must not be reused when that would alter their behavior.

## Dry-run fixture

The first dry-run is Ayvazoğlu Tuğla, `BRAND_FILM`, 40 seconds, 9:16, Turkish,
five independent 8-second scenes:

1. `HOOK_WORLD`
2. `PRODUCT_MATERIAL`
3. `PROFESSIONAL_USE`
4. `RESULT_PROOF`
5. `BRAND_RESOLUTION`

Long-form output is assembled through the isolated post-production worker and
stored with a scene manifest, measured ffprobe metadata, and byte SHA-256. The
short-form production path does not call this worker.

## Activation gate

Before remote activation, the implementation must prove:

- short-form golden prompts, routing and output schema are unchanged;
- 24/32/40-second plans produce valid, purpose-specific scene counts;
- scene retry is local and completed scenes are reusable only inside the same job;
- mock assembly produces ordered 720×1280 H.264/AAC output with a verified SHA;
- no live or paid canary starts before explicit approval.
