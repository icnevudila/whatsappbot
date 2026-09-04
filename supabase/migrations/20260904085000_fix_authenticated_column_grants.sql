-- Hizli gonderim contacts.upsert icin UPDATE gerekir.
-- Canli DB'de kolon bazli UPDATE grant'leri dusmus; yeniden veriyoruz.

grant usage on schema public to authenticated;

grant update (full_name, company, onboarding_step, onboarded_at) on public.profiles to authenticated;

grant update (label, enabled, daily_send_limit) on public.accounts to authenticated;

grant select, insert, delete on public.contacts to authenticated;
grant update (owner_id, phone_e164, name, extra, source) on public.contacts to authenticated;

grant update (
  name, message_type, body, creative_id, media_url, media_mime,
  source_list_ids, min_delay_seconds, max_delay_seconds,
  daily_cap_per_account, scheduled_at
) on public.campaigns to authenticated;

grant select, insert, update, delete on public.contact_lists to authenticated;
grant select, insert, update, delete on public.contact_list_members to authenticated;
