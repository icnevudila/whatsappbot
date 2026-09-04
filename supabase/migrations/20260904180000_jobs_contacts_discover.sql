-- contacts.discover: yerel isletme arama (or. Bursa kuaför)
alter table public.jobs drop constraint if exists jobs_type_check;

alter table public.jobs
  add constraint jobs_type_check check (type in (
    'account.connect',
    'account.disconnect',
    'account.logout',
    'account.request_pairing_code',
    'message.send',
    'contacts.verify',
    'contacts.scrape',
    'contacts.discover',
    'creative.render',
    'campaign.start',
    'campaign.pause',
    'campaign.resume',
    'campaign.stop'
  ));
