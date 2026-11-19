-- Home feed: trending community creations (Civitai, PG only) with their full
-- prompt and the closest model in our catalog, filled by sync-showcase.

create table public.showcase (
  id               text primary key,        -- "civitai:<image id>"
  source           text not null,           -- "civitai"
  media_type       text not null check (media_type in ('image', 'video')),
  media_url        text not null,           -- detail-size image / video (≈720–1080 px)
  preview_url      text,                    -- still frame for grids (jpeg, ≈450 px)
  preview_video_url text,                   -- light looping mp4 for grids (videos only, ≈450 px)
  width            integer,
  height           integer,
  prompt           text not null,
  negative_prompt  text,
  base_model       text,                    -- as reported by the source, e.g. "MiniMax H3"
  model_id         text references public.models (id) on delete set null, -- our closest model
  author           text,
  source_url       text not null,           -- link back to the original post (attribution)
  likes            integer not null default 0,
  sort             integer not null default 0,
  enabled          boolean not null default true,
  synced_at        timestamptz not null default now()
);

create index showcase_feed_idx on public.showcase (enabled, sort);

alter table public.showcase enable row level security;

create policy "anyone can read enabled showcase" on public.showcase
  for select to anon, authenticated using (enabled);
