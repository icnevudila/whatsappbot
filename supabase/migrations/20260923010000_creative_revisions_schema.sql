-- Migration: creative_revisions_schema.sql
-- Persistence and server-side locking for Campaign Video Wizard revisions.

CREATE TABLE IF NOT EXISTS public.creative_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.ai_media_jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'USER_EDITED', 'APPROVED', 'LOCKED_FOR_GENERATION')),
  creative_idea TEXT NOT NULL,
  selected_ad_format TEXT NOT NULL,
  speech_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  veo_prompt TEXT NOT NULL,
  campaign_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_sha_set JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_revisions_org_id ON public.creative_revisions(org_id);
CREATE INDEX IF NOT EXISTS idx_creative_revisions_job_id ON public.creative_revisions(job_id);

ALTER TABLE public.creative_revisions ENABLE ROW LEVEL SECURITY;

-- Tenants can view only their own revisions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'creative_revisions' AND policyname = 'tenants_view_own_revisions'
  ) THEN
    CREATE POLICY tenants_view_own_revisions ON public.creative_revisions
      FOR SELECT
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'creative_revisions' AND policyname = 'tenants_insert_own_revisions'
  ) THEN
    CREATE POLICY tenants_insert_own_revisions ON public.creative_revisions
      FOR INSERT
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'creative_revisions' AND policyname = 'tenants_update_own_revisions'
  ) THEN
    CREATE POLICY tenants_update_own_revisions ON public.creative_revisions
      FOR UPDATE
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;
END $$;
