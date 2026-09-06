-- Gelen WhatsApp pushName (profil gorunen adi) icin.

alter table public.message_log
  add column if not exists push_name text;

comment on column public.message_log.push_name is
  'WhatsApp pushName — karsi tarafin gonderdigi gorunen ad (yalnizca inbound).';
