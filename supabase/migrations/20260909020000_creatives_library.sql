-- İçerik kütüphanesi: başlık, kaynak, revizyon ebeveyni, yatay format, üye güncelleme.

alter table public.creatives
  add column if not exists title text,
  add column if not exists parent_id uuid references public.creatives (id) on delete set null,
  add column if not exists source text not null default 'upload',
  add column if not exists generation_type text not null default 'upload';

alter table public.creatives drop constraint if exists creatives_source_check;
alter table public.creatives
  add constraint creatives_source_check check (source in ('ai', 'upload'));

alter table public.creatives drop constraint if exists creatives_generation_type_check;
alter table public.creatives
  add constraint creatives_generation_type_check
  check (generation_type in ('new', 'derived', 'revision', 'variation', 'upload'));

alter table public.creatives drop constraint if exists creatives_format_check;
alter table public.creatives
  add constraint creatives_format_check
  check (format in ('story', 'feed', 'square', 'banner'));

update public.creatives
set
  source = 'ai',
  generation_type = 'new'
where template in ('ai_send', 'ai_library')
   or (template is not null and template not in ('upload', 'basic'));

update public.creatives
set
  source = 'upload',
  generation_type = 'upload'
where template in ('upload', 'basic')
  and source is distinct from 'ai';

comment on column public.creatives.title is 'Kütüphane kart başlığı. Boşsa brief/payload.title kullanılır.';
comment on column public.creatives.parent_id is 'Revizyon veya varyasyonun kaynak creative id si.';
comment on column public.creatives.source is 'ai = model üretimi, upload = kullanıcı dosyası.';
comment on column public.creatives.generation_type is 'new | derived | revision | variation | upload';

create index if not exists creatives_parent_idx
  on public.creatives (parent_id)
  where parent_id is not null;

create index if not exists creatives_org_source_idx
  on public.creatives (org_id, source, created_at desc);

drop policy if exists "creatives_update_member" on public.creatives;
create policy "creatives_update_member" on public.creatives
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
