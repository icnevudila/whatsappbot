-- Video masters awaiting human approval must remain visible without being ready
-- for campaign use. The customer library already handles this state explicitly.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.creatives DROP CONSTRAINT creatives_status_check;
ALTER TABLE public.creatives ADD CONSTRAINT creatives_status_check
  CHECK (status IN ('pending', 'rendering', 'ready', 'failed', 'needs_review'));
COMMIT;
