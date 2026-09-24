begin;

select plan(10);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.operations_events'::regclass),
  'operations_events has RLS enabled'
);

select is(has_table_privilege('anon', 'public.operations_events', 'SELECT'), false, 'anon cannot select events');
select is(has_table_privilege('anon', 'public.operations_events', 'INSERT'), false, 'anon cannot insert events');
select is(has_table_privilege('authenticated', 'public.operations_events', 'SELECT'), true, 'authenticated has the explicit select grant');
select is(has_table_privilege('authenticated', 'public.operations_events', 'INSERT'), false, 'authenticated cannot insert events');
select is(has_table_privilege('authenticated', 'public.operations_events', 'UPDATE'), false, 'authenticated cannot update append-only events');
select is(has_table_privilege('authenticated', 'public.operations_events', 'DELETE'), false, 'authenticated cannot delete append-only events');
select is(has_table_privilege('service_role', 'public.operations_events', 'INSERT'), true, 'service role can append events');

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'operations_events'
      and policyname = 'operations_events_select_authorized'
      and cmd = 'SELECT'
  ),
  'authorized select policy exists'
);

select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'operations_events'
  ),
  'operations_events is published for realtime'
);

select * from finish();
rollback;
