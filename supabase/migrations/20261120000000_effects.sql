-- Trend templates: one-tap viral photo → video effects (Vidu templates,
-- PixVerse effects, Kling effects on fal.ai). The user only picks a photo;
-- the server builds the provider input from this row, so clients can't
-- change the endpoint, effect or price.

create table public.effects (
  id               text primary key,          -- our id, e.g. "vidu-hug"
  endpoint         text not null,             -- fal endpoint
  field            text not null,             -- input field that selects the effect: template | effect | effect_scene
  value            text not null,             -- provider's effect id
  image_field      text not null,             -- input_image_urls | image_url
  image_array      boolean not null default true,
  extra            jsonb not null default '{}', -- fixed extra input (aspect ratio, duration, resolution)
  title            text not null,
  subtitle         text,                      -- what photo to pick
  category         text not null default 'trend',
  credits          integer not null check (credits > 0),
  preview_url      text,                      -- looping example video (public effect-previews bucket)
  poster_url       text,                      -- still for the card while the video loads
  preview_request  text,                      -- fal request id while seed-effect-previews renders the example
  sort             integer not null default 0,
  enabled          boolean not null default true,
  created_at       timestamptz not null default now()
);

create index effects_feed_idx on public.effects (enabled, sort);

alter table public.effects enable row level security;

create policy "anyone can read enabled effects" on public.effects
  for select to anon, authenticated using (enabled);

-- Example videos and the AI-generated sample people used to render them.
insert into storage.buckets (id, name, public)
values ('effect-previews', 'effect-previews', true)
on conflict (id) do nothing;

-- Credits = fal price × 1.25 margin / $0.01 (same formula as pricing.ts).
-- Vidu standard (hug, kiss, love_pose) is $0.20 → 25. Other Vidu templates may
-- be premium ($0.30) → 38. PixVerse 720p 5 s $0.20 → 25. Kling 1.6 Pro 5 s $0.49 → 62.
insert into public.effects (id, endpoint, field, value, image_field, image_array, extra, title, subtitle, category, credits, sort) values
  ('vidu-hug',          'fal-ai/vidu/template-to-video', 'template', 'hug',               'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'AI Hug',          'Photo with 2 people',  'couples',    25, 10),
  ('vidu-cheek-kiss',   'fal-ai/vidu/template-to-video', 'template', 'cheek_kiss',        'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Cheek Kiss',      'Photo with 2 people',  'couples',    38, 20),
  ('vidu-carry-me',     'fal-ai/vidu/template-to-video', 'template', 'carry_me',          'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Carry Me',        'Photo with 2 people',  'couples',    38, 30),
  ('vidu-flying',       'fal-ai/vidu/template-to-video', 'template', 'flying',            'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Fly Away',        'Full-body photo',      'transform',  38, 40),
  ('vidu-grow-wings',   'fal-ai/vidu/template-to-video', 'template', 'grow_wings',        'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Angel Wings',     'Photo of one person',  'transform',  38, 50),
  ('vidu-earth-zoom',   'fal-ai/vidu/template-to-video', 'template', 'earth_zoom_out',    'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Earth Zoom Out',  'Outdoor photo',        'camera',     38, 60),
  ('vidu-muscle',       'fal-ai/vidu/template-to-video', 'template', 'muscling',          'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Muscle Up',       'Photo of one person',  'transform',  38, 70),
  ('vidu-hair-color',   'fal-ai/vidu/template-to-video', 'template', 'hair_color_change', 'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Hair Color Swap', 'Face clearly visible', 'transform',  38, 80),
  ('vidu-clone',        'fal-ai/vidu/template-to-video', 'template', 'cloning',           'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Clone Me',        'Photo of one person',  'fx',         38, 90),
  ('vidu-runway',       'fal-ai/vidu/template-to-video', 'template', 'fashion_stride',    'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Runway Walk',     'Full-body photo',      'fx',         38, 100),
  ('pixverse-liquid-metal', 'fal-ai/pixverse/v5/effects', 'effect', 'Liquid Metal',     'image_url', false, '{"resolution":"720p","duration":"5"}', 'Liquid Metal',  'Photo of one person', 'fx',        25, 110),
  ('pixverse-dust',         'fal-ai/pixverse/v5/effects', 'effect', 'Dust Me Away',     'image_url', false, '{"resolution":"720p","duration":"5"}', 'Dust Me Away',  'Photo of one person', 'fx',        25, 120),
  ('pixverse-age-ripple',   'fal-ai/pixverse/v5/effects', 'effect', 'The Age Ripple',   'image_url', false, '{"resolution":"720p","duration":"5"}', 'Age Ripple',    'Face clearly visible', 'transform', 25, 130),
  ('pixverse-mini-me',      'fal-ai/pixverse/v5/effects', 'effect', 'Mini Me Unboxed',  'image_url', false, '{"resolution":"720p","duration":"5"}', 'Mini Me Toy',   'Full-body photo',     'fx',        25, 140),
  ('pixverse-werewolf',     'fal-ai/pixverse/v5/effects', 'effect', 'Werewolf Rage',    'image_url', false, '{"resolution":"720p","duration":"5"}', 'Werewolf',      'Photo of one person', 'transform', 25, 150),
  ('kling-bullet-time',     'fal-ai/kling-video/v1.6/pro/effects', 'effect_scene', 'bullet_time_360',      'input_image_urls', true, '{"duration":"5"}', 'Bullet Time 360', 'Full-body photo',      'camera',    62, 160),
  ('kling-vampire',         'fal-ai/kling-video/v1.6/pro/effects', 'effect_scene', 'vampire_transform',    'input_image_urls', true, '{"duration":"5"}', 'Vampire',         'Photo of one person',  'transform', 62, 170),
  ('kling-expression',      'fal-ai/kling-video/v1.6/pro/effects', 'effect_scene', 'expression_challenge', 'input_image_urls', true, '{"duration":"5"}', 'Expression Challenge', 'Face clearly visible', 'fx',   62, 180);
