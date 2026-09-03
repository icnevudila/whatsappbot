-- Kapsayan indeksi olmayan foreign key'ler.
-- Bunlar yalnizca JOIN icin degil: ana tablodan silme geldiginde Postgres
-- cocuk tabloyu FK kolonundan tarar. Indeks yoksa her silme tam tarama olur.

create index campaign_targets_account_idx on public.campaign_targets (account_id);
create index campaign_targets_contact_idx on public.campaign_targets (contact_id);
create index campaigns_creative_idx on public.campaigns (creative_id);
create index creatives_brand_kit_idx on public.creatives (brand_kit_id);
create index jobs_campaign_idx on public.jobs (campaign_id);
