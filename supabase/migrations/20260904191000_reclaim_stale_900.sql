-- Worker STALE_JOB_SECONDS=900 ile hizala; scrape/discover 5 dk'da reclaim edilmesin.
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'wa-reclaim-stale-jobs') then
      perform cron.unschedule((select jobid from cron.job where jobname = 'wa-reclaim-stale-jobs' limit 1));
    end if;

    perform cron.schedule(
      'wa-reclaim-stale-jobs',
      '*/2 * * * *',
      'select wa.reclaim_stale_jobs(900)'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron reclaim schedule skipped: %', sqlerrm;
end;
$cron$;
