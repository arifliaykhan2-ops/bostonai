-- Recast (your face into any short video) and Photoshoot (you in a new scene,
-- same face across shots — a no-training take on Higgsfield's Soul ID).
--
--   requires_consent  the user must confirm the photo is them or that they have permission
--   more_photos       optional extra photos appended to the image_field array (up to N)
--   video_input       { field, label, max_seconds } — the user uploads a short video
--
-- Recast: Wan 2.2 Animate Replace at 580p, $0.06 per video second, ≤10 s → $0.60 → 75 credits.
--   fal turns its safety checkers off by default; we turn both on.
-- Photoshoot: Nano Banana Pro edit, $0.15/image → 19 credits. Scenes are fixed prompts.

alter table public.effects
  add column if not exists requires_consent boolean not null default false,
  add column if not exists more_photos      integer not null default 0,
  add column if not exists video_input      jsonb;

update public.effects set requires_consent = true where id = 'app-talking-photo';

insert into public.effects
  (id, endpoint, field, value, image_field, image_array, extra, title, subtitle, description, category, section, kind, input_kind,
   choices, video_input, requires_consent, more_photos, credits, poster_url, width, height, sort)
values
  ('app-recast', 'fal-ai/wan/v2.2-14b/animate/replace', 'app', 'animate_replace', 'image_url', false,
   '{"resolution":"580p","video_quality":"high","enable_safety_checker":true,"enable_output_safety_checker":true}',
   'Recast', 'Star in any video', 'Upload a short video and your photo: you take the place of the person in it, same moves.',
   'face', 'app', 'video', 'photo',
   '[]', '{"field":"video_url","label":"Video (up to 10 s)","max_seconds":10}', true, 0, 75,
   'https://v3.fal.media/files/penguin/YKoL7e0b41wIerWU6PA6x_7fcafa06db85466e9864c8f006cb13a7.jpg', 1, 1, 6),

  ('app-photoshoot', 'fal-ai/nano-banana-pro/edit', 'app', 'photoshoot', 'image_urls', true,
   '{"resolution":"2K","aspect_ratio":"3:4","output_format":"jpeg","num_images":1}',
   'Photoshoot', 'You, anywhere', 'Add 1–3 photos of yourself and pick a scene: same face, new photoshoot.',
   'face', 'app', 'image', 'photo',
   '[{"field":"prompt","label":"Scene","default":"studio","options":[
      {"value":"Use the person in the reference photos and keep their face, hair and identity exactly. A high-end studio portrait on a seamless warm gray backdrop, soft key light, 85mm lens, sharp focus, magazine quality.","label":"Studio portrait"},
      {"value":"Use the person in the reference photos and keep their face, hair and identity exactly. They walk down a Paris street at golden hour, stylish casual outfit, cafés and Haussmann buildings behind, 35mm film look, natural light.","label":"Paris street"},
      {"value":"Use the person in the reference photos and keep their face, hair and identity exactly. They stand on a sunny tropical beach at sunset, linen outfit, turquoise water behind, warm natural light, candid travel photo.","label":"Beach sunset"},
      {"value":"Use the person in the reference photos and keep their face, hair and identity exactly. A neon-lit Tokyo street at night, rain reflections, cinematic teal and magenta light, modern streetwear, 35mm.","label":"Tokyo night"},
      {"value":"Use the person in the reference photos and keep their face, hair and identity exactly. A fashion editorial for a luxury magazine, elegant tailored outfit, dramatic studio lighting, bold pose, high fashion photography.","label":"Fashion editorial"},
      {"value":"Use the person in the reference photos and keep their face, hair and identity exactly. A cozy café by a window with morning light, holding a cup of coffee, relaxed smile, shallow depth of field, lifestyle photo.","label":"Cozy café"},
      {"value":"Use the person in the reference photos and keep their face, hair and identity exactly. On a snowy mountain peak in winter gear, bright blue sky, adventurous pose, crisp outdoor photography.","label":"Snowy mountain"},
      {"value":"Use the person in the reference photos and keep their face, hair and identity exactly. A professional business headshot in a modern glass office, smart suit, confident smile, soft daylight.","label":"Business"}]}]',
   null, true, 2, 19,
   'https://v3b.fal.media/files/b/0a9c2f0f/p3rXI18zMYTBz1M0qP2h4_b9a2087ce0b64cd788cb5ec067edc26e.jpg', 1, 1, 7)
on conflict (id) do nothing;
