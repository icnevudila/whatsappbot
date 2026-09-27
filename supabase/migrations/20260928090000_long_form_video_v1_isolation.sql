-- LONG_FORM_VIDEO_V1 is an explicit product boundary. Existing short jobs keep
-- their historical defaults and state machine behaviour.

ALTER TABLE public.ai_media_jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'SHORT_FORM_VIDEO',
  ADD COLUMN IF NOT EXISTS parent_job_id UUID REFERENCES public.ai_media_jobs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scene_id TEXT,
  ADD COLUMN IF NOT EXISTS scene_index INT,
  ADD COLUMN IF NOT EXISTS post_production_status TEXT,
  ADD COLUMN IF NOT EXISTS post_production_manifest JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ai_media_attempts
  ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'SHORT_FORM_VIDEO',
  ADD COLUMN IF NOT EXISTS parent_job_id UUID,
  ADD COLUMN IF NOT EXISTS scene_id TEXT,
  ADD COLUMN IF NOT EXISTS scene_index INT,
  ADD COLUMN IF NOT EXISTS post_production_status TEXT,
  ADD COLUMN IF NOT EXISTS post_production_manifest JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ai_media_outputs
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'SHORT_FORM_VIDEO',
  ADD COLUMN IF NOT EXISTS scene_manifest JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS post_production_manifest JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_jobs_creative_engine_mode_check'
  ) THEN
    ALTER TABLE public.ai_media_jobs DROP CONSTRAINT ai_media_jobs_creative_engine_mode_check;
  END IF;

  ALTER TABLE public.ai_media_jobs
    ADD CONSTRAINT ai_media_jobs_creative_engine_mode_check
    CHECK (creative_engine_mode IN ('CURRENT', 'SIMPLE_V5_HYBRID', 'LONG_FORM_VIDEO_V1'));

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_jobs_job_type_check'
  ) THEN
    ALTER TABLE public.ai_media_jobs
      ADD CONSTRAINT ai_media_jobs_job_type_check
      CHECK (job_type IN ('SHORT_FORM_VIDEO', 'LONG_FORM_VIDEO_V1'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_attempts_job_type_check'
  ) THEN
    ALTER TABLE public.ai_media_attempts
      ADD CONSTRAINT ai_media_attempts_job_type_check
      CHECK (job_type IN ('SHORT_FORM_VIDEO', 'LONG_FORM_VIDEO_V1'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_media_outputs_product_type_check'
  ) THEN
    ALTER TABLE public.ai_media_outputs
      ADD CONSTRAINT ai_media_outputs_product_type_check
      CHECK (product_type IN ('SHORT_FORM_VIDEO', 'LONG_FORM_VIDEO_V1'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_ai_media_jobs_product_type_state
  ON public.ai_media_jobs (job_type, state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_media_jobs_parent_scene
  ON public.ai_media_jobs (parent_job_id, scene_index);
