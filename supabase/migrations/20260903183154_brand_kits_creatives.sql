-- Marka kiti ve uretilen kreatifler.

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  logo_path text,
  colors jsonb not null default
    '{"primary":"#111111","secondary":"#4b5563","accent":"#2563eb","background":"#ffffff","text":"#111111"}'::jsonb,
  fonts jsonb not null default '{"heading":"Inter","body":"Inter"}'::jsonb,
  tone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_kits_name_unique unique (owner_id, name)
);

comment on column public.brand_kits.logo_path is 'brand-assets bucket icindeki yol. Bucket ozel, imzali URL ile okunur.';

create index brand_kits_owner_idx on public.brand_kits (owner_id);

-- Kullanici basina en fazla bir varsayilan kit.
create unique index brand_kits_one_default_idx
  on public.brand_kits (owner_id)
  where is_default;

create trigger brand_kits_set_updated_at
  before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- creatives: satori -> resvg ile uretilen PNG'ler
-- ---------------------------------------------------------------------------
create table public.creatives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_kit_id uuid references public.brand_kits (id) on delete set null,
  template text not null default 'basic',
  format text not null default 'feed'
    check (format in ('story', 'feed', 'square')),
  payload jsonb not null default '{}'::jsonb,

  storage_path text,
  public_url text,
  width int check (width > 0),
  height int check (height > 0),

  status text not null default 'pending'
    check (status in ('pending', 'rendering', 'ready', 'failed')),
  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Baileys mediaCache anahtari yalnizca "tip + URL"; icerik hash'i degil.
-- Bu yuzden ayni yola dosya ustune yazilmaz, her kreatif yeni bir yol alir.
comment on column public.creatives.public_url is 'creatives bucket public URL. mediaCache''in isini gormesi icin sabit ve tekrar kullanilabilir olmali.';
comment on column public.creatives.storage_path is 'Her render yeni yol alir; ayni URL uzerine dosya degistirilmez.';

create index creatives_owner_idx on public.creatives (owner_id, created_at desc);
create index creatives_status_idx on public.creatives (status) where status in ('pending', 'rendering');

create trigger creatives_set_updated_at
  before update on public.creatives
  for each row execute function public.set_updated_at();
