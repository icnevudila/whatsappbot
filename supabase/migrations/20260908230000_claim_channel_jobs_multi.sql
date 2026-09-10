-- Allow comma-separated channel filters (e.g. 'facebook,instagram' for meta-service).
-- '*' or empty still claims all channels.

create or replace function public.claim_channel_jobs(
  p_worker_id text,
  p_channel text,
  p_limit int default 10
)
returns setof public.channel_jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  channels text[];
begin
  if p_channel is null or btrim(p_channel) = '' or p_channel = '*' then
    channels := null;
  else
    channels := string_to_array(p_channel, ',');
  end if;

  return query
  with candidate as (
    select j.id
      from public.channel_jobs j
      left join public.organizations o on o.id = j.org_id
     where j.status = 'pending'
       and j.run_after <= now()
       and (channels is null or j.channel = any(channels))
       and (o.id is null or o.suspended_at is null)
     order by j.priority, j.run_after, j.id
     limit greatest(p_limit, 1)
     for update of j skip locked
  )
  update public.channel_jobs j
     set status = 'claimed',
         claimed_by = p_worker_id,
         claimed_at = now(),
         attempts = j.attempts + 1,
         updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end;
$$;

revoke all on function public.claim_channel_jobs(text, text, int) from public, anon, authenticated;
grant execute on function public.claim_channel_jobs(text, text, int) to service_role;
