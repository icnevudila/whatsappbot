-- Persist creative-mode and provider-routing provenance without weakening the
-- existing tenant RLS policies. Existing jobs keep their historical behaviour.

ALTER TABLE public.ai_media_jobs
  ADD COLUMN IF NOT EXISTS creative_engine_mode TEXT NOT NULL DEFAULT 'CURRENT',
  ADD COLUMN IF NOT EXISTS requested_provider TEXT NOT NULL DEFAULT 'FLOW_VEO',
  ADD COLUMN IF NOT EXISTS selected_provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_account_id TEXT,
  ADD COLUMN IF NOT EXISTS capability_state TEXT,
  ADD COLUMN IF NOT EXISTS fallback_from TEXT,
  ADD COLUMN IF NOT EXISTS fallback_reason TEXT,
  ADD COLUMN IF NOT EXISTS raw_output_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_completed_at TIMESTAMPTZ;

ALTER TABLE public.ai_media_attempts
  ADD COLUMN IF NOT EXISTS requested_provider TEXT NOT NULL DEFAULT 'FLOW_VEO',
  ADD COLUMN IF NOT EXISTS selected_provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_account_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_attempt_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_project_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_media_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS capability_state TEXT,
  ADD COLUMN IF NOT EXISTS fallback_from TEXT,
  ADD COLUMN IF NOT EXISTS fallback_reason TEXT,
  ADD COLUMN IF NOT EXISTS raw_output_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_jobs_creative_engine_mode_check'
  ) THEN
    ALTER TABLE public.ai_media_jobs
      ADD CONSTRAINT ai_media_jobs_creative_engine_mode_check
      CHECK (creative_engine_mode IN ('CURRENT', 'SIMPLE_V5_HYBRID'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_jobs_requested_provider_check'
  ) THEN
    ALTER TABLE public.ai_media_jobs
      ADD CONSTRAINT ai_media_jobs_requested_provider_check
      CHECK (requested_provider IN ('AUTO', 'GEMINI_NATIVE_VIDEO', 'FLOW_VEO'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_jobs_selected_provider_check'
  ) THEN
    ALTER TABLE public.ai_media_jobs
      ADD CONSTRAINT ai_media_jobs_selected_provider_check
      CHECK (selected_provider IS NULL OR selected_provider IN ('GEMINI_NATIVE_VIDEO', 'FLOW_VEO'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_jobs_capability_state_check'
  ) THEN
    ALTER TABLE public.ai_media_jobs
      ADD CONSTRAINT ai_media_jobs_capability_state_check
      CHECK (capability_state IS NULL OR capability_state IN (
        'AVAILABLE', 'NO_QUOTA', 'FEATURE_UNAVAILABLE',
        'TEMPORARILY_UNAVAILABLE', 'AUTH_REQUIRED', 'UNKNOWN'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_attempts_requested_provider_check'
  ) THEN
    ALTER TABLE public.ai_media_attempts
      ADD CONSTRAINT ai_media_attempts_requested_provider_check
      CHECK (requested_provider IN ('AUTO', 'GEMINI_NATIVE_VIDEO', 'FLOW_VEO'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_attempts_selected_provider_check'
  ) THEN
    ALTER TABLE public.ai_media_attempts
      ADD CONSTRAINT ai_media_attempts_selected_provider_check
      CHECK (selected_provider IS NULL OR selected_provider IN ('GEMINI_NATIVE_VIDEO', 'FLOW_VEO'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_attempts_capability_state_check'
  ) THEN
    ALTER TABLE public.ai_media_attempts
      ADD CONSTRAINT ai_media_attempts_capability_state_check
      CHECK (capability_state IS NULL OR capability_state IN (
        'AVAILABLE', 'NO_QUOTA', 'FEATURE_UNAVAILABLE',
        'TEMPORARILY_UNAVAILABLE', 'AUTH_REQUIRED', 'UNKNOWN'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_jobs_fallback_reason_check'
  ) THEN
    ALTER TABLE public.ai_media_jobs
      ADD CONSTRAINT ai_media_jobs_fallback_reason_check
      CHECK (fallback_reason IS NULL OR fallback_reason IN (
        'NO_QUOTA', 'FEATURE_UNAVAILABLE', 'TEMPORARILY_UNAVAILABLE'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_attempts_fallback_reason_check'
  ) THEN
    ALTER TABLE public.ai_media_attempts
      ADD CONSTRAINT ai_media_attempts_fallback_reason_check
      CHECK (fallback_reason IS NULL OR fallback_reason IN (
        'NO_QUOTA', 'FEATURE_UNAVAILABLE', 'TEMPORARILY_UNAVAILABLE'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_jobs_raw_output_sha256_check'
  ) THEN
    ALTER TABLE public.ai_media_jobs
      ADD CONSTRAINT ai_media_jobs_raw_output_sha256_check
      CHECK (raw_output_sha256 IS NULL OR raw_output_sha256 ~ '^[0-9a-f]{64}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_attempts_raw_output_sha256_check'
  ) THEN
    ALTER TABLE public.ai_media_attempts
      ADD CONSTRAINT ai_media_attempts_raw_output_sha256_check
      CHECK (raw_output_sha256 IS NULL OR raw_output_sha256 ~ '^[0-9a-f]{64}$');
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_ai_media_jobs_provider_state
  ON public.ai_media_jobs (requested_provider, selected_provider, state);

CREATE INDEX IF NOT EXISTS idx_ai_media_attempts_job_provider
  ON public.ai_media_attempts (job_id, selected_provider, started_at DESC);
