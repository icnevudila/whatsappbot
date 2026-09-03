-- WhatsApp'in gercek "yeni sohbet mesaj kotasi" ve reach-out time-lock durumu.
--
-- Baileys rc14'te bu bilgiyi veren iki uc var: fetchNewChatMessageCap() ve
-- fetchAccountReachoutTimelock(), ayrica canli 'message-capping.update' olayi.
-- Bu, ban'in bilinen teknik sebebini tahmin etmek yerine sunucudan okumamizi
-- sagliyor: 463 reach-out time-lock, tanimadigi kisilere gonderim butcesi
-- tukendiginde geliyor. Kampanya motoru kotaya bakip kendini durduracak.

alter table public.accounts
  add column new_chat_quota_total int,
  add column new_chat_quota_used int,
  add column new_chat_quota_cycle_end timestamptz,
  add column reachout_locked_until timestamptz,
  add column reachout_lock_type text;

comment on column public.accounts.new_chat_quota_total is 'WhatsApp new-chat message cap: donem basina tanimadigi kisiye gonderim kotasi. Baileys message-capping.update olayindan gelir.';
comment on column public.accounts.new_chat_quota_used is 'Ayni donemde kullanilan kota. Kampanya motoru buna bakip durur.';
comment on column public.accounts.reachout_locked_until is '463 reach-out time-lock bitis zamani. Doluysa kampanya baslatilmaz.';
