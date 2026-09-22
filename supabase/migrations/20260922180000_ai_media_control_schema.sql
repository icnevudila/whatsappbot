-- Migration: 20260922180000_ai_media_control_schema.sql
-- Decoupled AI Media Control & Flow Engine System Schema

-- 1. Kanonik Durum Enum'ı (18 Durum)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_media_job_state') THEN
    CREATE TYPE public.ai_media_job_state AS ENUM (
      'PENDING',
      'VALIDATING_INPUTS',
      'QUEUED',
      'LEASED',
      'PREPARING_ENV',
      'OPENING_PROJECT',
      'ATTACHING_INGREDIENTS',
      'INGREDIENTS_VERIFIED',
      'GENERATING',
      'POLLING_FLOW',
      'DOWNLOADING_MEDIA',
      'MEDIA_DOWNLOADED',
      'FFPROBE_INSPECTING',
      'SHA256_VERIFYING',
      'VISUAL_QA_EVALUATING',
      'COMPLETED',
      'NEEDS_REVIEW',
      'FAILED'
    );
  END IF;
END $$;

-- 2. Global Sistem Kaynakları (Tenant Ownership Olmayan Ortak Havuz)
CREATE TABLE IF NOT EXISTS public.flow_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'cooling_down', 'rate_limited', 'needs_reauth', 'blocked', 'agent_ui_blocked', 'maintenance')),
  persistent_profile_path TEXT NOT NULL,
  current_job_id UUID,
  credit_balance INT,
  last_credit_checked_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  consecutive_failures INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flow_account_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES public.flow_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  before_credits INT,
  after_credits INT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flow_workers (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL,
  pid INT,
  cpu_percent NUMERIC(5,2),
  ram_bytes BIGINT,
  ram_percent NUMERIC(5,2),
  active_job_id UUID,
  status TEXT NOT NULL DEFAULT 'online',
  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 3. Tenant İzolasyonlu Ana İş Tablosu
CREATE TABLE IF NOT EXISTS public.ai_media_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'veo-fast',
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  duration_seconds INT NOT NULL DEFAULT 8,
  state public.ai_media_job_state NOT NULL DEFAULT 'PENDING',
  priority INT NOT NULL DEFAULT 0,
  lease_worker_id TEXT,
  lease_account_id TEXT REFERENCES public.flow_accounts(id) ON DELETE SET NULL,
  lease_timeout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  error_code TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  expected_ingredient_count INT NOT NULL DEFAULT 0,
  actual_ingredient_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 4. Deneme (Attempt) Tablosu
CREATE TABLE IF NOT EXISTS public.ai_media_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.ai_media_jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  flow_account_id TEXT REFERENCES public.flow_accounts(id) ON DELETE SET NULL,
  flow_project_id TEXT,
  worker_id TEXT,
  status TEXT NOT NULL,
  exit_code INT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error_details TEXT,
  incident_id TEXT
);

-- 5. Append-Only Denetim Günlüğü (Audit Trail)
CREATE TABLE IF NOT EXISTS public.ai_media_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.ai_media_jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.ai_media_attempts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_state public.ai_media_job_state,
  to_state public.ai_media_job_state,
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Girdi Medya & Asset Tablosu
CREATE TABLE IF NOT EXISTS public.ai_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.ai_media_jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('logo', 'product', 'reference', 'style')),
  file_path TEXT NOT NULL,
  storage_url TEXT,
  original_filename TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  width INT,
  height INT,
  attached_chip_name TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Çıktı Tablosu (ffprobe, sha256 ve %10/%50/%90 Visual QA)
CREATE TABLE IF NOT EXISTS public.ai_media_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.ai_media_jobs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.ai_media_attempts(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  storage_url TEXT,
  sha256 TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  duration_seconds NUMERIC(6,2),
  width INT,
  height INT,
  fps NUMERIC(6,2),
  vcodec TEXT,
  acodec TEXT,
  visual_qa_score NUMERIC(4,2),
  visual_qa_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  qa_frame_10_url TEXT,
  qa_frame_50_url TEXT,
  qa_frame_90_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Olay ve Hata Paketleri (Incidents - Redacted, Admin-Only)
CREATE TABLE IF NOT EXISTS public.flow_incidents (
  id TEXT PRIMARY KEY,
  job_id UUID REFERENCES public.ai_media_jobs(id) ON DELETE SET NULL,
  attempt_id UUID REFERENCES public.ai_media_attempts(id) ON DELETE SET NULL,
  flow_account_id TEXT REFERENCES public.flow_accounts(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_code TEXT NOT NULL,
  screenshot_path TEXT,
  dom_dump_path TEXT,
  har_path TEXT,
  is_redacted BOOLEAN NOT NULL DEFAULT true,
  diagnostics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_ai_media_jobs_org_state ON public.ai_media_jobs(org_id, state);
CREATE INDEX IF NOT EXISTS idx_ai_media_jobs_priority_created ON public.ai_media_jobs(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_media_events_job_created ON public.ai_media_events(job_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_media_assets_job_id ON public.ai_media_assets(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_media_outputs_job_id ON public.ai_media_outputs(job_id);
CREATE INDEX IF NOT EXISTS idx_flow_incidents_job_id ON public.flow_incidents(job_id);

-- RLS Güvenlik Politikaları
ALTER TABLE public.flow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_account_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_media_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_media_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_media_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_media_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_incidents ENABLE ROW LEVEL SECURITY;

-- Tenant Tabloları için RLS (organization_members üzerinden kontrol)
CREATE POLICY "ai_media_jobs_tenant_select" ON public.ai_media_jobs
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_media_events_tenant_select" ON public.ai_media_events
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_media_assets_tenant_select" ON public.ai_media_assets
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_media_outputs_tenant_select" ON public.ai_media_outputs
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Service Role tüm tablolara tam erişebilir (Tek Write Authority: ai-media-control)
-- flow_accounts, flow_workers ve flow_incidents super-admin veya service_role tarafından okunabilir.
CREATE POLICY "flow_accounts_auth_select" ON public.flow_accounts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "flow_workers_auth_select" ON public.flow_workers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "flow_incidents_auth_select" ON public.flow_incidents
  FOR SELECT TO authenticated
  USING (true);
