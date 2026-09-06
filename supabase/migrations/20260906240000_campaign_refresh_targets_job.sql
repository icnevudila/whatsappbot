-- Kampanya düzenleme: hedef yenileme job tipi.

alter table public.jobs drop constraint if exists jobs_type_check;

alter table public.jobs
  add constraint jobs_type_check check (type in (
    'account.connect',
    'account.disconnect',
    'account.logout',
    'account.request_pairing_code',
    'message.send',
    'contacts.verify',
    'contacts.check_phone',
    'contacts.scrape',
    'contacts.discover',
    'creative.render',
    'campaign.start',
    'campaign.pause',
    'campaign.resume',
    'campaign.stop',
    'campaign.refresh_targets'
  ));
