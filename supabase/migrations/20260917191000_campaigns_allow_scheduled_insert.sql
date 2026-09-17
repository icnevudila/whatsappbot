-- Panel "Planla" ile insert'te status=scheduled yazabilsin.
-- Eski trigger authenticated insert'te status'u her zaman draft'a çekiyordu;
-- scheduled_at dolu kalsa bile liste/düzenle taslak görünüyordu.

create or replace function public.campaigns_force_draft_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and coalesce((select auth.role()), '') = 'authenticated' then
    -- Worker alanlarını panelden yazılamaz tut.
    new.started_at := null;
    new.paused_at := null;
    new.completed_at := null;
    new.stop_reason := null;
    new.sent_count := 0;
    new.failed_count := 0;
    new.skipped_count := 0;
    new.total_targets := 0;

    -- Planlı kampanya: gelecekteki scheduled_at ile status=scheduled'a izin ver.
    if new.status = 'scheduled'
       and new.scheduled_at is not null
       and new.scheduled_at > now() then
      new.status := 'scheduled';
    else
      new.status := 'draft';
      if new.scheduled_at is not null and new.scheduled_at <= now() then
        new.scheduled_at := null;
      end if;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.campaigns_force_draft_on_insert() is
  'Authenticated insert: sayaç/worker alanlarını sıfırlar; draft veya geleceğe planlı scheduled’a izin verir.';

-- Daha önce yanlışlıkla draft kalan planlı kayıtları düzelt.
update public.campaigns
   set status = 'scheduled'
 where status = 'draft'
   and scheduled_at is not null
   and scheduled_at > now();
