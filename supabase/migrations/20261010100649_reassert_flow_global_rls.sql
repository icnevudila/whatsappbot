-- Historical ordering may run before the Flow schema exists. Reasserted by
-- 20261010100649 after all schema migrations; never grants tenant access.
DO $$
DECLARE target text;
BEGIN
 FOREACH target IN ARRAY ARRAY['flow_accounts','flow_account_events','flow_workers','flow_incidents'] LOOP
  IF to_regclass('public.' || target) IS NOT NULL THEN
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',target);
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',target || '_auth_select',target);
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',target || '_service_only',target);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (false)',target || '_service_only',target);
  END IF;
 END LOOP;
 IF to_regclass('public.ai_media_attempts') IS NOT NULL THEN
  DROP POLICY IF EXISTS ai_media_attempts_tenant_select ON public.ai_media_attempts;
  CREATE POLICY ai_media_attempts_tenant_select ON public.ai_media_attempts FOR SELECT TO authenticated
   USING(org_id IN (SELECT org_id FROM public.organization_members WHERE user_id=auth.uid()));
 END IF;
END $$;
