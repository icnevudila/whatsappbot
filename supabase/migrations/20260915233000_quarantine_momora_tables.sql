-- Momora projesinden bu WhatsApp veritabanina kaymis tablolar.
-- Veriyi silmek yerine public disina alir; gerekirse geri tasinabilir.

create schema if not exists quarantine_momora;

revoke all on schema quarantine_momora from public, anon, authenticated;
grant usage on schema quarantine_momora to service_role;

do $$
declare
  table_name text;
  table_names text[] := array[
    'momora_baby_letters',
    'momora_community_comments',
    'momora_community_posts',
    'momora_contraction_sessions',
    'momora_daily_logs',
    'momora_family_messages',
    'momora_family_sync',
    'momora_hospital_bag_items',
    'momora_kick_sessions',
    'momora_profiles',
    'momora_push_tokens',
    'momora_state_snapshots',
    'momora_tracking_events'
  ];
begin
  foreach table_name in array table_names loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I set schema quarantine_momora', table_name);
    end if;
  end loop;
end
$$;

grant all on all tables in schema quarantine_momora to service_role;
