-- Add warmup_bypass to campaigns table
alter table public.campaigns
add column if not exists warmup_bypass boolean not null default false;

grant select, insert, update (warmup_bypass) on public.campaigns to authenticated;
