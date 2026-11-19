-- Apps (Higgsfield-style photo tools) and result actions (Upscale, Add sound)
-- share public.effects with the trend templates: the server builds the fal input
-- from the row, so clients only send a photo, an allowed choice, or a job id.
--
--   section  trend  = Home feed template (photo → video)
--            app    = Apps tab tool (photo → image, sometimes a second photo)
--            action = runs on one of the user's finished jobs (input_kind job_image / job_video)
--   choices  [{ field, label, default, options: [{ value, label }] }] — the user picks one option per choice;
--            the server accepts only listed values.
--   image2   { field, label } — optional second photo (e.g. the garment for try-on).
--
-- Credits = fal price × 1.25 / $0.01: image-apps-v2 $0.04 → 5; Topaz image ≤48 MP
-- $0.16 → 20; Topaz video to ≤1080p $0.02/s × ≤15 s → 40; MMAudio $0.001/s → 5 (floor).

alter table public.effects
  add column if not exists section     text not null default 'trend' check (section in ('trend', 'app', 'action')),
  add column if not exists kind        text not null default 'video' check (kind in ('video', 'image')),
  add column if not exists input_kind  text not null default 'photo' check (input_kind in ('photo', 'job_image', 'job_video')),
  add column if not exists choices     jsonb not null default '[]',
  add column if not exists image2      jsonb,
  add column if not exists description text;

insert into public.effects
  (id, endpoint, field, value, image_field, image_array, extra, title, subtitle, description, category, section, kind, input_kind, choices, image2, credits, poster_url, width, height, sort)
values
  ('app-relight', 'fal-ai/image-apps-v2/relighting', 'app', 'relighting', 'image_url', false, '{}',
   'Relight', 'Change the light', 'Studio, golden hour, neon… relight any photo in one tap.', 'enhance', 'app', 'image', 'photo',
   '[{"field":"lighting_style","label":"Light","default":"golden_hour","options":[
      {"value":"golden_hour","label":"Golden hour"},{"value":"studio","label":"Studio"},{"value":"neon","label":"Neon"},
      {"value":"dramatic","label":"Dramatic"},{"value":"soft","label":"Soft"},{"value":"backlight","label":"Backlight"},
      {"value":"rim_light","label":"Rim light"},{"value":"sunset","label":"Sunset"},{"value":"moonlight","label":"Moonlight"},
      {"value":"candlelight","label":"Candlelight"},{"value":"blue_hour","label":"Blue hour"},{"value":"spotlight","label":"Spotlight"}]}]',
   null, 5, 'https://v3.fal.media/files/koala/W0d6z5pWtVwakzxtKd4K4_94f6ab5b5820440db672dce73d447bff.jpg', 1, 1, 10),

  ('app-headshot', 'fal-ai/image-apps-v2/headshot-photo', 'app', 'headshot', 'image_url', false, '{}',
   'Headshot', 'Pro photo from a selfie', 'A clean, studio-style headshot for LinkedIn or your CV.', 'face', 'app', 'image', 'photo',
   '[{"field":"background_style","label":"Background","default":"professional","options":[
      {"value":"professional","label":"Professional"},{"value":"corporate","label":"Corporate"},
      {"value":"clean","label":"Clean"},{"value":"gradient","label":"Gradient"}]}]',
   null, 5, 'https://v3b.fal.media/files/b/0a9f9397/qOgy4s7YmYEJqKtZYJXm4_2ub0fLrs.png', 1, 1, 20),

  ('app-skin', 'fal-ai/image-apps-v2/portrait-enhance', 'app', 'portrait_enhance', 'image_url', false, '{}',
   'Skin Enhancer', 'Natural retouch', 'Smoother skin and sharper details that still look like you.', 'enhance', 'app', 'image', 'photo',
   '[]', null, 5, 'https://v3.fal.media/files/monkey/9kZMXV4GvRettHUuudKER_3f04e4f8fd0e4f28ad957c2a3bf9f3e5.jpg', 1, 1, 30),

  ('app-hair', 'fal-ai/image-apps-v2/hair-change', 'app', 'hair_change', 'image_url', false, '{}',
   'Hair Change', 'New cut, new color', 'Try a new hairstyle and color before the salon.', 'style', 'app', 'image', 'photo',
   '[{"field":"target_hairstyle","label":"Style","default":"long_hair","options":[
      {"value":"long_hair","label":"Long"},{"value":"bob_cut","label":"Bob"},{"value":"pixie_cut","label":"Pixie"},
      {"value":"curly_hair","label":"Curly"},{"value":"wavy_hair","label":"Wavy"},{"value":"braids","label":"Braids"},
      {"value":"high_ponytail","label":"Ponytail"},{"value":"bun","label":"Bun"},{"value":"bangs","label":"Bangs"},
      {"value":"buzz_cut","label":"Buzz cut"},{"value":"afro","label":"Afro"}]},
     {"field":"hair_color","label":"Color","default":"natural","options":[
      {"value":"natural","label":"Natural"},{"value":"blonde","label":"Blonde"},{"value":"platinum_blonde","label":"Platinum"},
      {"value":"black","label":"Black"},{"value":"dark_brown","label":"Brown"},{"value":"red","label":"Red"},
      {"value":"silver","label":"Silver"},{"value":"pink","label":"Pink"},{"value":"blue","label":"Blue"},{"value":"balayage","label":"Balayage"}]}]',
   null, 5, 'https://v3b.fal.media/files/b/0a9f92cc/aUmpKwGz4nPeB6JqmAyxr_pKYFLz4u.png', 1, 1, 40),

  ('app-age', 'fal-ai/image-apps-v2/age-modify', 'app', 'age_modify', 'image_url', false, '{"preserve_identity":true}',
   'Age Filter', 'See yourself older', 'See how you could look at 30, 45, 60 or 80.', 'face', 'app', 'image', 'photo',
   '[{"field":"target_age","label":"Age","default":60,"options":[
      {"value":25,"label":"25"},{"value":30,"label":"30"},{"value":45,"label":"45"},{"value":60,"label":"60"},{"value":80,"label":"80"}]}]',
   null, 5, 'https://v3b.fal.media/files/b/0a9f92d1/Qxw_mCwonRGWuTHeZO8ws_WLSTUVaP.png', 1, 1, 50),

  ('app-expression', 'fal-ai/image-apps-v2/expression-change', 'app', 'expression_change', 'image_url', false, '{}',
   'Expression', 'Change the mood', 'Turn a straight face into a smile, a laugh or a surprised look.', 'face', 'app', 'image', 'photo',
   '[{"field":"target_expression","label":"Expression","default":"smile","options":[
      {"value":"smile","label":"Smile"},{"value":"laugh","label":"Laugh"},{"value":"surprise","label":"Surprise"},
      {"value":"confident","label":"Confident"},{"value":"playful","label":"Playful"},{"value":"dreamy","label":"Dreamy"},
      {"value":"serious","label":"Serious"},{"value":"mysterious","label":"Mysterious"},{"value":"shocked","label":"Shocked"},
      {"value":"thoughtful","label":"Thoughtful"}]}]',
   null, 5, 'https://v3b.fal.media/files/b/0a9f9399/1xwlPDXChlONvXBANlDA2_cr0Axu7D.png', 1, 1, 60),

  ('app-makeup', 'fal-ai/image-apps-v2/makeup-application', 'app', 'makeup', 'image_url', false, '{"intensity":"medium"}',
   'Makeup', 'Try a look', 'From natural to glam: try makeup looks on your own photo.', 'style', 'app', 'image', 'photo',
   '[{"field":"makeup_style","label":"Look","default":"natural","options":[
      {"value":"natural","label":"Natural"},{"value":"glamorous","label":"Glam"},{"value":"smoky_eyes","label":"Smoky eyes"},
      {"value":"bold_lips","label":"Bold lips"},{"value":"korean_style","label":"Korean"},{"value":"bridal","label":"Bridal"},
      {"value":"dramatic","label":"Dramatic"},{"value":"remove_makeup","label":"No makeup"}]}]',
   null, 5, 'https://v3b.fal.media/files/b/0a9f92d9/3qIFHMUe2cB8r_aGBf_rZ_qCgzTa6I.png', 1, 1, 70),

  ('app-tryon', 'fal-ai/image-apps-v2/virtual-try-on', 'app', 'virtual_try_on', 'person_image_url', false, '{"preserve_pose":true}',
   'Outfit Swap', 'Try on any outfit', 'Add your photo and a clothing photo: see it on you.', 'style', 'app', 'image', 'photo',
   '[]', '{"field":"clothing_image_url","label":"Clothing photo"}', 5,
   'https://v3.fal.media/files/tiger/dd5748sfMpq2uZzoUA_Y3_6377b3f9ee8e49afa174da674a80b9a6.jpg', 1, 1, 80),

  ('app-style', 'fal-ai/image-apps-v2/style-transfer', 'app', 'style_transfer', 'image_url', false, '{}',
   'Style Me', 'Your photo, new style', 'Turn your photo into 3D cartoon, comic, pixel art and more.', 'style', 'app', 'image', 'photo',
   '[{"field":"target_style","label":"Style","default":"cartoon_3d","options":[
      {"value":"cartoon_3d","label":"3D cartoon"},{"value":"comic_book_animation","label":"Comic"},{"value":"claymation","label":"Clay"},
      {"value":"pixel_art","label":"Pixel art"},{"value":"cyberpunk_future","label":"Cyberpunk"},{"value":"synthwave","label":"Synthwave"},
      {"value":"y2k","label":"Y2K"},{"value":"impressionist","label":"Painting"},{"value":"lofi_aesthetic","label":"Lo-fi"},
      {"value":"hyperrealistic","label":"Hyperreal"}]}]',
   null, 5, 'https://v3.fal.media/files/kangaroo/uZNy5XjPfUQJOs0Kuw7C4_367de9bbd3034716b9432d637c3b369d.jpg', 1, 1, 90),

  ('app-angles', 'fal-ai/qwen-image-edit-2509-lora-gallery/multiple-angles', 'app', 'multiple_angles', 'image_urls', true, '{"vertical_angle":0}',
   'Angles', 'A new camera angle', 'See the same shot from the left, right or side.', 'camera', 'app', 'image', 'photo',
   '[{"field":"rotate_right_left","label":"Camera","default":45,"options":[
      {"value":-90,"label":"Far left"},{"value":-45,"label":"Left"},{"value":45,"label":"Right"},{"value":90,"label":"Far right"}]}]',
   null, 8, 'https://v3b.fal.media/files/b/monkey/JbSGvZquN8vZSqhmHBK9o_6549790441a74cefa9f0afdfbd2a182c.jpg', 1, 1, 100),

  ('app-expand', 'fal-ai/image-apps-v2/outpaint', 'app', 'outpaint', 'image_url', false, '{"output_format":"jpeg"}',
   'Expand', 'Zoom out the scene', 'AI fills in what is outside the frame.', 'camera', 'app', 'image', 'photo',
   '[{"field":"zoom_out_percentage","label":"Zoom out","default":30,"options":[
      {"value":20,"label":"A little"},{"value":30,"label":"More"},{"value":50,"label":"A lot"}]}]',
   null, 5, 'https://v3b.fal.media/files/b/kangaroo/_JfxHHU5PSR2RsM0r9O3S_549a1d78995c4babae440a2d345e621b.jpg', 1, 1, 110),

  ('app-bg-remove', 'pixelcut/background-removal', 'app', 'background_removal', 'image_url', false, '{"output_format":"rgba","sync_mode":false}',
   'Remove Background', 'Clean cut-out', 'Remove the background in one tap — perfect for stickers and products.', 'enhance', 'app', 'image', 'photo',
   '[]', null, 4, 'https://v3b.fal.media/files/b/0a8e11aa/gFKCEDWIuxTOpt8Yn8Igr_5b5e714fe11d4742b2cb3abaa13b589c.jpg', 1, 1, 120),

  ('app-restore', 'fal-ai/image-apps-v2/photo-restoration', 'app', 'photo_restoration', 'image_url', false,
   '{"enhance_resolution":true,"remove_scratches":true,"fix_colors":true}',
   'Restore Photo', 'Bring old photos back', 'Fixes scratches, faded colors and blur in old photos.', 'enhance', 'app', 'image', 'photo',
   '[]', null, 5, 'https://v3.fal.media/files/kangaroo/oP9mu0F1Obx0ufyEEVAgn_3f7a878f3cf54a078fa8e0d53524020a.jpg', 1, 1, 130),

  -- Result actions (shown on a finished job, not in any list)
  ('action-upscale-image', 'fal-ai/topaz/upscale/image', 'action', 'upscale_image', 'image_url', false,
   '{"upscale_factor":2,"output_format":"jpeg","face_enhancement":true}',
   'Upscale', 'Sharper, 2× bigger', null, 'action', 'action', 'image', 'job_image', '[]', null, 20, null, null, null, 0),

  ('action-upscale-video', 'fal-ai/topaz/upscale/video', 'action', 'upscale_video', 'video_url', false,
   '{"upscale_factor":1.5,"H264_output":true}',
   'Upscale', 'Sharper, up to 1080p', null, 'action', 'action', 'video', 'job_video', '[]', null, 40, null, null, null, 0),

  ('action-add-sound', 'fal-ai/mmaudio-v2', 'action', 'add_sound', 'video_url', false,
   '{"prompt":"realistic sound effects and ambience that match what happens in the video","duration":8}',
   'Add sound', 'AI sound effects', null, 'action', 'action', 'video', 'job_video', '[]', null, 5, null, null, null, 0)
on conflict (id) do nothing;
