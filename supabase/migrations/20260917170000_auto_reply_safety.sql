-- Auto-reply safety guards: contact policy, schedule, operator silence, escalation message
alter table public.organizations
  add column if not exists auto_reply_contact_policy text not null default 'unknown_only',
  add column if not exists auto_reply_schedule text not null default 'always',
  add column if not exists auto_reply_operator_silence_minutes int not null default 30,
  add column if not exists auto_reply_escalation_message text not null default 'Talebinizi aldık. Sizi müşteri temsilcimize aktarıyorum, en kısa sürede sizinle iletişime geçilecektir.';

comment on column public.organizations.auto_reply_contact_policy is
  'unknown_only: Sadece rehberde kayitli olmayan yeni numaralara yanit ver; all: Herkese yanit ver.';

comment on column public.organizations.auto_reply_schedule is
  'always: 7/24 yanit ver; outside_hours: Sadece mesai saatleri disinda; working_hours: Sadece mesai saatlerinde.';

comment on column public.organizations.auto_reply_operator_silence_minutes is
  'Insan operator musteriyi yanitladiktan sonra botun sessiz kalacagi dakika.';

comment on column public.organizations.auto_reply_escalation_message is
  'Musteri yetkili/temsilci istediginde gonderilecek standart nezaket aktarim mesaji.';

grant update (
  auto_reply_enabled,
  auto_reply_contact_policy,
  auto_reply_schedule,
  auto_reply_operator_silence_minutes,
  auto_reply_escalation_message
) on public.organizations to authenticated;
