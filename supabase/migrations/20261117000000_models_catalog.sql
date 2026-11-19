-- Model catalog, filled by the sync-models Edge Function from fal.ai's public
-- model API (schema, thumbnails, example outputs) and pricing API.
-- The app reads it directly; generate reads cost and input mapping from it.

create table public.models (
  id             text primary key,            -- fal endpoint id, e.g. fal-ai/kling-video/v3/standard/image-to-video
  kind           text not null check (kind in ('image', 'video')),
  name           text not null,
  description    text,
  credits        integer not null check (credits > 0),
  needs_image    boolean not null default false,
  thumbnail_url  text,
  example_url    text,                        -- sample output (mp4 / image) shown as a reference
  input_map      jsonb not null default '{}', -- how to build the fal input: { image_field, image_is_array, extras }
  unit_price     numeric,
  unit           text,
  sort           integer not null default 100,
  enabled        boolean not null default true,
  updated_at     timestamptz not null default now()
);

alter table public.models enable row level security;

create policy "anyone can read enabled models" on public.models
  for select to anon, authenticated using (enabled);
