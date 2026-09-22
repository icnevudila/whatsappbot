-- Migration: 20260922172700_fix_global_table_rls.sql
-- Fix RLS on global system tables:
-- flow_accounts, flow_workers, flow_incidents, flow_account_events
-- MUST be admin/service-role ONLY — not readable by customer tenants.
-- Customer accounts must not see Flow email addresses, HAR/DOM dumps, etc.

-- 1. Drop the overly permissive policies on global tables
DROP POLICY IF EXISTS "flow_accounts_auth_select" ON public.flow_accounts;
DROP POLICY IF EXISTS "flow_workers_auth_select" ON public.flow_workers;
DROP POLICY IF EXISTS "flow_incidents_auth_select" ON public.flow_incidents;

-- 2. Re-create as service_role only (no authenticated user access)
-- Note: service_role bypasses RLS by default in Supabase,
-- so we create policies that DENY all authenticated users.
-- The ai-media-control service uses service_role key → full access.

-- flow_accounts: NO customer read
CREATE POLICY "flow_accounts_service_only" ON public.flow_accounts
  FOR ALL
  USING (false);
-- Service role bypasses RLS automatically; authenticated users see nothing.

-- flow_account_events: NO customer read
CREATE POLICY "flow_account_events_service_only" ON public.flow_account_events
  FOR ALL
  USING (false);

-- flow_workers: NO customer read
CREATE POLICY "flow_workers_service_only" ON public.flow_workers
  FOR ALL
  USING (false);

-- flow_incidents: NO customer read (contains HAR/DOM/credential artifacts)
CREATE POLICY "flow_incidents_service_only" ON public.flow_incidents
  FOR ALL
  USING (false);

-- 3. Ensure ai_media_attempts also has tenant-scoped RLS
CREATE POLICY IF NOT EXISTS "ai_media_attempts_tenant_select" ON public.ai_media_attempts
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
