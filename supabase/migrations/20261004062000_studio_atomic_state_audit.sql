-- State and audit insertion are one transaction: an audit failure rolls back state.
ALTER TYPE public.ai_media_job_state ADD VALUE IF NOT EXISTS 'MEDIA_PROCESSING';
ALTER TYPE public.ai_media_job_state ADD VALUE IF NOT EXISTS 'QUALITY_CHECK';

CREATE OR REPLACE FUNCTION public.studio_lease_job(p_job_id uuid, p_worker_id text, p_account_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE owned_org uuid;
BEGIN
  IF nullif(trim(p_worker_id), '') IS NULL OR nullif(trim(p_account_id), '') IS NULL THEN
    RAISE EXCEPTION 'Missing lease identity';
  END IF;
  UPDATE public.ai_media_jobs SET state = 'LEASED', lease_worker_id = p_worker_id,
    lease_account_id = p_account_id, lease_timeout_at = now() + interval '10 minutes', updated_at = now()
    WHERE id = p_job_id AND state = 'QUEUED' RETURNING org_id INTO owned_org;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.ai_media_events(job_id, org_id, event_type, from_state, to_state, message, payload)
    VALUES(p_job_id, owned_org, 'STATE_TRANSITION', 'QUEUED', 'LEASED', 'Worker acquired job lease',
      jsonb_build_object('worker_id', p_worker_id, 'account_id', p_account_id));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.studio_transition_job(p_job_id uuid, p_org_id uuid,
  p_from public.ai_media_job_state, p_to public.ai_media_job_state, p_message text,
  p_payload jsonb, p_attempt_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  UPDATE public.ai_media_jobs SET state = p_to, updated_at = now(),
    completed_at = CASE WHEN p_to = 'COMPLETED' THEN now() ELSE completed_at END,
    lease_account_id = CASE WHEN p_to IN ('COMPLETED','FAILED','NEEDS_REVIEW') THEN NULL ELSE lease_account_id END,
    lease_worker_id = CASE WHEN p_to IN ('COMPLETED','FAILED','NEEDS_REVIEW') THEN NULL ELSE lease_worker_id END,
    lease_timeout_at = CASE WHEN p_to IN ('COMPLETED','FAILED','NEEDS_REVIEW') THEN NULL ELSE lease_timeout_at END
    WHERE id = p_job_id AND org_id = p_org_id AND state = p_from;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.ai_media_events(job_id, org_id, attempt_id, event_type, from_state, to_state, message, payload)
    VALUES(p_job_id, p_org_id, p_attempt_id, 'STATE_TRANSITION', p_from, p_to, p_message, coalesce(p_payload, '{}'::jsonb));
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.studio_lease_job(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.studio_transition_job(uuid,uuid,public.ai_media_job_state,public.ai_media_job_state,text,jsonb,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_lease_job(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.studio_transition_job(uuid,uuid,public.ai_media_job_state,public.ai_media_job_state,text,jsonb,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.studio_prepare_job(p_job_id uuid, p_org_id uuid, p_account_id text, p_attempt_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  UPDATE public.ai_media_jobs SET state = 'PREPARING_ENV', updated_at = now()
    WHERE id = p_job_id AND org_id = p_org_id AND state = 'LEASED' AND lease_account_id = p_account_id;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.ai_media_events(job_id, org_id, attempt_id, event_type, from_state, to_state, message, payload)
    VALUES(p_job_id, p_org_id, p_attempt_id, 'STATE_TRANSITION', 'LEASED', 'PREPARING_ENV',
      'Provider capacity and owned account lease verified', '{"provider_submitted":false}'::jsonb);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.studio_prepare_job(uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_prepare_job(uuid,uuid,text,uuid) TO service_role;
