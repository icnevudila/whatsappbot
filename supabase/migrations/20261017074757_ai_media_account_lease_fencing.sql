-- One transaction owns the physical account, logical job and audit receipt.
-- Expired jobs are deliberately not reclaimed here: provider result may exist.
CREATE OR REPLACE FUNCTION public.studio_lease_job(p_job_id uuid, p_worker_id text, p_account_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE owned_org uuid;
BEGIN
  IF nullif(trim(p_worker_id), '') IS NULL OR nullif(trim(p_account_id), '') IS NULL THEN
    RAISE EXCEPTION 'Missing lease identity';
  END IF;
  PERFORM 1 FROM public.flow_accounts
    WHERE id = p_account_id AND status = 'idle' AND current_job_id IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  -- Include expired leases: expiration does not prove the browser stopped.
  IF EXISTS (SELECT 1 FROM public.ai_media_jobs WHERE lease_account_id = p_account_id
      AND state NOT IN ('COMPLETED', 'FAILED', 'NEEDS_REVIEW')) THEN
    RETURN false;
  END IF;
  UPDATE public.ai_media_jobs SET state = 'LEASED', lease_worker_id = p_worker_id,
    lease_account_id = p_account_id, lease_timeout_at = now() + interval '10 minutes', updated_at = now()
    WHERE id = p_job_id AND state = 'QUEUED' RETURNING org_id INTO owned_org;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.flow_accounts SET status = 'busy', current_job_id = p_job_id, updated_at = now()
    WHERE id = p_account_id;
  INSERT INTO public.ai_media_events(job_id, org_id, event_type, from_state, to_state, message, payload)
    VALUES(p_job_id, owned_org, 'STATE_TRANSITION', 'QUEUED', 'LEASED', 'Worker acquired job and account lease',
      jsonb_build_object('worker_id', p_worker_id, 'account_id', p_account_id));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.studio_lease_job(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_lease_job(uuid,text,text) TO service_role;

-- A stale owner may not revive an expired browser lease.
CREATE OR REPLACE FUNCTION public.heartbeat_browser_account_lease(
  p_provider text, p_account_id text, p_lease_token text, p_ttl_seconds int DEFAULT 60
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_updated int;
BEGIN
  IF p_ttl_seconds <= 0 THEN RETURN false; END IF;
  UPDATE public.browser_account_leases SET heartbeat_at = clock_timestamp(),
    expires_at = clock_timestamp() + make_interval(secs => p_ttl_seconds)
    WHERE provider = p_provider AND account_id = p_account_id
      AND lease_token = p_lease_token AND released_at IS NULL AND expires_at > clock_timestamp();
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END $$;
REVOKE ALL ON FUNCTION public.heartbeat_browser_account_lease(text,text,text,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_browser_account_lease(text,text,text,int) TO service_role;
