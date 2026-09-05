-- Coklu worker: account_id'li isler yalnizca kira sahibi (veya kirasiz connect*) tarafindan claim edilir.
create or replace function wa.claim_jobs(
  p_worker_id text,
  p_limit int default 10
)
returns setof public.jobs
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select j.id
      from public.jobs j
      left join wa.session_lease sl on sl.account_id = j.account_id
     where j.status = 'pending'
       and j.run_after <= now()
       and (
         -- Org / hesabi olmayan isler: herhangi bir worker.
         j.account_id is null
         -- Bu worker hesabi tutuyor.
         or (
           sl.holder_id = p_worker_id
           and sl.expires_at > now()
         )
         -- Kira yok / dolmus: yalnizca oturum acma-kapama isleri (kira buradan alinir).
         or (
           (sl.account_id is null or sl.expires_at <= now())
           and j.type in (
             'account.connect',
             'account.disconnect',
             'account.logout',
             'account.request_pairing_code'
           )
         )
       )
     order by j.priority, j.run_after, j.id
     limit greatest(p_limit, 1)
     for update of j skip locked
  )
  update public.jobs j
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

revoke all on function wa.claim_jobs(text, int) from public, anon, authenticated;
grant execute on function wa.claim_jobs(text, int) to service_role;

comment on function wa.claim_jobs(text, int) is
  'Pending job claim. account_id doluysa lease holder affinity; kirasiz yalnizca account.* baglanti isleri.';
