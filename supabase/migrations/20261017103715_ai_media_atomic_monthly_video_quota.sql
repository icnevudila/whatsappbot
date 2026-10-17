-- Serialize quota admission for every writer, including direct service inserts.
-- INVOKER deliberately retains the caller's existing organization/job RLS.
CREATE OR REPLACE FUNCTION public.enforce_ai_media_monthly_video_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  quota integer;
  used bigint;
  counted_states constant text[] := ARRAY[
    'PENDING','VALIDATING_INPUTS','QUEUED','LEASED','PREPARING_ENV','OPENING_PROJECT',
    'ATTACHING_INGREDIENTS','INGREDIENTS_VERIFIED','GENERATING','POLLING_FLOW',
    'DOWNLOADING_MEDIA','MEDIA_DOWNLOADED','MEDIA_PROCESSING','QUALITY_CHECK',
    'FFPROBE_INSPECTING','SHA256_VERIFYING','VISUAL_QA_EVALUATING','COMPLETED','NEEDS_REVIEW'
  ];
  month_start timestamptz := date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.org_id IS DISTINCT FROM OLD.org_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION USING ERRCODE = 'PZ403', MESSAGE = 'VIDEO_QUOTA_IDENTITY_IMMUTABLE';
    END IF;
    IF OLD.state::text = ANY(counted_states) THEN RETURN NEW; END IF;
  END IF;
  IF NOT (NEW.state::text = ANY(counted_states)) OR NEW.created_at < month_start THEN RETURN NEW; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('monthly-video-quota:' || NEW.org_id::text, 0));
  SELECT monthly_video_quota INTO quota FROM public.organizations WHERE id = NEW.org_id;
  IF quota IS NULL OR quota <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'PZ503', MESSAGE = 'VIDEO_QUOTA_UNAVAILABLE';
  END IF;
  SELECT count(*) INTO used FROM public.ai_media_jobs
    WHERE org_id = NEW.org_id AND created_at >= month_start AND state::text = ANY(counted_states);
  IF used >= quota THEN
    RAISE EXCEPTION USING ERRCODE = 'PZ429', MESSAGE = 'MONTHLY_VIDEO_QUOTA_EXCEEDED';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.enforce_ai_media_monthly_video_quota() FROM PUBLIC;
DROP TRIGGER IF EXISTS ai_media_monthly_video_quota ON public.ai_media_jobs;
CREATE TRIGGER ai_media_monthly_video_quota
  BEFORE INSERT OR UPDATE OF state, org_id, created_at ON public.ai_media_jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ai_media_monthly_video_quota();
