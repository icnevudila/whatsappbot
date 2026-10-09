-- Candidate only. Fail rather than delete existing duplicate queue entries.
-- The worker reuses this row when retrying; explicit completed/failed attempts
-- may create a new row, but two active dispatchers cannot own one creative.
create unique index if not exists jobs_one_active_creative_render
on public.jobs (org_id, (payload->>'creative_id'))
where type = 'creative.render'
  and status in ('pending', 'claimed', 'running')
  and payload->>'creative_id' is not null;
