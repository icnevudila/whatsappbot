-- Panel authenticated insert needs identity sequence; workers need full DML.

do $$
declare
  seq_name text;
begin
  select pg_get_serial_sequence('public.channel_jobs', 'id') into seq_name;
  if seq_name is not null then
    execute format('grant usage, select on sequence %s to authenticated, service_role', seq_name);
  end if;
end $$;

grant select, insert, update, delete on public.channel_jobs to service_role;
grant select, insert, update, delete on public.channel_worker_heartbeat to service_role;
