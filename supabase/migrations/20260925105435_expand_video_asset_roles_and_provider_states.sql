-- Video-only contract alignment. These values are already emitted by the video
-- wizard/router; keep database checks in sync without changing image tables.

ALTER TABLE public.ai_media_assets
  DROP CONSTRAINT IF EXISTS ai_media_assets_role_check;

ALTER TABLE public.ai_media_assets
  ADD CONSTRAINT ai_media_assets_role_check
  CHECK (role IN (
    'logo', 'product', 'reference', 'style', 'packaging', 'environment', 'presenter'
  )) NOT VALID;

ALTER TABLE public.ai_media_assets
  VALIDATE CONSTRAINT ai_media_assets_role_check;

ALTER TABLE public.ai_media_jobs
  DROP CONSTRAINT IF EXISTS ai_media_jobs_capability_state_check,
  DROP CONSTRAINT IF EXISTS ai_media_jobs_fallback_reason_check;

ALTER TABLE public.ai_media_jobs
  ADD CONSTRAINT ai_media_jobs_capability_state_check
    CHECK (capability_state IS NULL OR capability_state IN (
      'AVAILABLE', 'AVAILABLE_WITH_WARNING', 'NO_QUOTA', 'FEATURE_UNAVAILABLE',
      'TEMPORARILY_UNAVAILABLE', 'AUTH_REQUIRED', 'ACCOUNT_CONFIGURATION_REQUIRED', 'UNKNOWN'
    )) NOT VALID,
  ADD CONSTRAINT ai_media_jobs_fallback_reason_check
    CHECK (fallback_reason IS NULL OR fallback_reason IN (
      'NO_QUOTA', 'FEATURE_UNAVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'ACCOUNT_CONFIGURATION_REQUIRED'
    )) NOT VALID;

ALTER TABLE public.ai_media_jobs
  VALIDATE CONSTRAINT ai_media_jobs_capability_state_check;

ALTER TABLE public.ai_media_jobs
  VALIDATE CONSTRAINT ai_media_jobs_fallback_reason_check;

ALTER TABLE public.ai_media_attempts
  DROP CONSTRAINT IF EXISTS ai_media_attempts_capability_state_check,
  DROP CONSTRAINT IF EXISTS ai_media_attempts_fallback_reason_check;

ALTER TABLE public.ai_media_attempts
  ADD CONSTRAINT ai_media_attempts_capability_state_check
    CHECK (capability_state IS NULL OR capability_state IN (
      'AVAILABLE', 'AVAILABLE_WITH_WARNING', 'NO_QUOTA', 'FEATURE_UNAVAILABLE',
      'TEMPORARILY_UNAVAILABLE', 'AUTH_REQUIRED', 'ACCOUNT_CONFIGURATION_REQUIRED', 'UNKNOWN'
    )) NOT VALID,
  ADD CONSTRAINT ai_media_attempts_fallback_reason_check
    CHECK (fallback_reason IS NULL OR fallback_reason IN (
      'NO_QUOTA', 'FEATURE_UNAVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'ACCOUNT_CONFIGURATION_REQUIRED'
    )) NOT VALID;

ALTER TABLE public.ai_media_attempts
  VALIDATE CONSTRAINT ai_media_attempts_capability_state_check;

ALTER TABLE public.ai_media_attempts
  VALIDATE CONSTRAINT ai_media_attempts_fallback_reason_check;
