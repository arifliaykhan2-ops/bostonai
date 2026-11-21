-- More Apps tab tools (Higgsfield-style), all on fal.ai endpoints. Each row only
-- uses inputs public.effects already supports (photo, second photo, video, text).
--
-- Credits = fal price × 1.25 / $0.01 (prices from fal.ai, Nov 2026):
--   Kling 3 Motion Control (standard)  $0.126/s × ≤10 s           → 158
--   Kling 3 image-to-video (standard)  $0.084/s × 5 s, audio off   → 53
--   PixVerse 6 Transition              5 s 720p, no audio $0.225   → 29
--   Nano Banana Pro edit               $0.15/image (1K–2K)         → 19
--   image-apps-v2, Bria FIBO Edit      $0.04/image                 → 5
--
-- Examples: rows with fal's own example input/output set poster_url/before_url
-- here. The rest (poster_url null) get one rendered by seed-effect-previews,
-- which runs on before_url when set (Bria's sample sketch / B&W photo / room).
--
-- Face Swap: image2.field = image_field, so the target photo goes into the same
-- image_urls array as the face: [face, target] (see buildEffectInput).
-- Object Eraser: text_input.field is the endpoint field (object_name); no TTS,
-- credits_per_char 0, so the price stays flat.

insert into public.effects
  (id, endpoint, field, value, image_field, image_array, extra, title, subtitle, description, category, section, kind, input_kind,
   choices, image2, text_input, video_input, requires_consent, more_photos, credits, poster_url, before_url, preview_url, width, height, sort)
values
  -- ── Video ──
  ('app-motion-control', 'fal-ai/kling-video/v3/standard/motion-control', 'app', 'motion_control', 'image_url', false,
   '{"character_orientation":"video","keep_original_sound":true,"enable_safety_checker":true}',
   'Motion Control', 'Copy any move',
   'Upload a dance or any short clip and your photo: you do exactly the same moves.',
   'video', 'app', 'video', 'photo',
   '[]', null, null, '{"field":"video_url","label":"Moves video (up to 10 s)","max_seconds":10}', true, 0, 158,
   'https://v3b.fal.media/files/b/0a90ee31/VHtWK5BZMa-XoT6gahJKS_077.png', null,
   'https://v3b.fal.media/files/b/0a90ee68/7-xpX-LTxX_nRHL776FrZ_output.mp4', 1, 1, 1),

  ('app-transition', 'fal-ai/pixverse/v6/transition', 'app', 'transition', 'first_image_url', false,
   '{"resolution":"720p","duration":5,"enable_safety_checker":true}',
   'Transition', 'Morph one photo into another',
   'Pick a start and an end photo: get a smooth cinematic transition video between them.',
   'video', 'app', 'video', 'photo',
   '[{"field":"prompt","label":"Transition","default":"Smooth seamless morph transition from the first scene into the second scene, continuous cinematic camera movement.","options":[
      {"value":"Smooth seamless morph transition from the first scene into the second scene, continuous cinematic camera movement.","label":"Morph"},
      {"value":"The camera rushes forward and zooms through the first scene, emerging seamlessly into the second scene. Dynamic cinematic transition.","label":"Zoom through"},
      {"value":"A fast whip-pan camera move blurs the first scene and lands seamlessly on the second scene. Energetic transition.","label":"Whip pan"},
      {"value":"The first scene melts and flows like liquid, reforming into the second scene. Surreal, smooth transition.","label":"Liquid melt"}]},
    {"field":"aspect_ratio","label":"Format","default":"9:16","options":[
      {"value":"9:16","label":"9:16 · Stories"},{"value":"1:1","label":"1:1 · Square"},{"value":"16:9","label":"16:9 · Wide"}]}]',
   '{"field":"end_image_url","label":"End photo"}', null, null, false, 0, 29,
   'https://v3.fal.media/files/kangaroo/RgedFs_WSnq5BgER7qDx1_ONrbTJ1YAGXz-9JnSsBoB_bdc8750387734bfe940319f469f7b0b2.jpg',
   'https://v3.fal.media/files/zebra/owQh2DAzk8UU7J02nr5RY_Co2P4boLv6meIZ5t9gKvL_8685da151df343ab8bf82165c928e2a5.jpg',
   null, 1, 1, 4),

  ('app-bullet-time', 'fal-ai/kling-video/v3/standard/image-to-video', 'app', 'bullet_time', 'start_image_url', false,
   '{"duration":"5","generate_audio":false,"cfg_scale":0.5,"negative_prompt":"blur, distort, and low quality","prompt":"Bullet time effect: the moment freezes and the camera orbits smoothly 180 degrees around the subject, who stays perfectly still in mid-motion. Dust and small particles hang in the air. Cinematic slow motion."}',
   'Bullet Time', 'Freeze the moment', 'Time stops and the camera flies around you, like in an action film.',
   'video', 'app', 'video', 'photo', '[]', null, null, null, false, 0, 53, null, null, null, 1, 1, 8),

  ('app-crash-zoom', 'fal-ai/kling-video/v3/standard/image-to-video', 'app', 'crash_zoom', 'start_image_url', false,
   '{"duration":"5","generate_audio":false,"cfg_scale":0.5,"negative_prompt":"blur, distort, and low quality","prompt":"A fast, dramatic crash zoom: the camera rushes from a wide shot straight into a close-up of the face of the subject, then holds while they react with surprise. Energetic and cinematic."}',
   'Crash Zoom', 'Dramatic zoom in', 'The camera rushes in on you for a dramatic, meme-ready close-up.',
   'video', 'app', 'video', 'photo', '[]', null, null, null, false, 0, 53, null, null, null, 1, 1, 9),

  ('app-orbit', 'fal-ai/kling-video/v3/standard/image-to-video', 'app', 'orbit_360', 'start_image_url', false,
   '{"duration":"5","generate_audio":false,"cfg_scale":0.5,"negative_prompt":"blur, distort, and low quality","prompt":"The camera makes a smooth, full 360-degree orbit around the subject, who stays in place and turns their head slightly to follow the camera. Steady, cinematic, consistent lighting."}',
   '360 Orbit', 'The camera circles you', 'A smooth 360° camera move around you, from one photo.',
   'video', 'app', 'video', 'photo', '[]', null, null, null, false, 0, 53, null, null, null, 1, 1, 135),

  ('app-behind-scenes', 'fal-ai/kling-video/v3/standard/image-to-video', 'app', 'behind_the_scenes', 'start_image_url', false,
   '{"duration":"5","generate_audio":false,"cfg_scale":0.5,"negative_prompt":"blur, distort, and low quality","prompt":"Behind-the-scenes footage: the camera pulls back to reveal that this photo is being shot on a professional film set, with crew members, studio lights, a camera on a dolly and a director around the subject, who keeps posing. Handheld documentary style."}',
   'Behind the Scenes', 'Reveal the film set', 'The camera pulls back and your photo turns out to be a shoot on a big film set.',
   'video', 'app', 'video', 'photo', '[]', null, null, null, false, 0, 53, null, null, null, 1, 1, 140),

  -- ── Face & identity ──
  ('app-face-swap', 'fal-ai/nano-banana-pro/edit', 'app', 'face_swap', 'image_urls', true,
   '{"resolution":"2K","output_format":"jpeg","num_images":1,"aspect_ratio":"auto","prompt":"Image 1 shows the face of a person. Image 2 is the target photo. Recreate image 2 exactly, with the same scene, pose, body, clothing, hair, lighting, framing and style, but give the person in it the face of the person from image 1: same facial features, skin tone and identity. Blend it naturally and photorealistically."}',
   'Face Swap', 'Your face, any photo', 'Add your photo and any target photo: you take the place of the person in it.',
   'face', 'app', 'image', 'photo',
   '[]', '{"field":"image_urls","label":"Target photo"}', null, null, true, 0, 19, null, null, null, 1, 1, 2),

  ('app-figure', 'fal-ai/nano-banana-pro/edit', 'app', 'figure_3d', 'image_urls', true,
   '{"resolution":"2K","output_format":"jpeg","num_images":1,"aspect_ratio":"3:4","prompt":"Turn the person in the photo into a realistic 1/7 scale collectible PVC figure of them, keeping their face, hair and outfit recognisable. The figure stands on a round clear acrylic base on a wooden desk, with its colorful original toy box behind it and a computer screen showing the 3D model of the figure. Studio product photo, soft light, sharp focus. No existing brands or characters."}',
   '3D Figure', 'You as a collectible', 'Turn yourself into a collectible figure, box and all.',
   'fun', 'app', 'image', 'photo', '[]', null, null, null, true, 0, 19, null, null, null, 1, 1, 3),

  ('app-plush', 'fal-ai/nano-banana-pro/edit', 'app', 'plush', 'image_urls', true,
   '{"resolution":"2K","output_format":"jpeg","num_images":1,"aspect_ratio":"3:4","prompt":"Turn the person in the photo into a cute, soft plush toy version of themselves, keeping their hairstyle, outfit colours and recognisable features. Felt and fleece fabric texture, visible stitching, embroidered eyes. The plush sits on a bed in a cozy, softly lit bedroom. Product photo, shallow depth of field."}',
   'Plush Toy', 'You as a soft toy', 'A cuddly plush version of you, stitches and all.',
   'fun', 'app', 'image', 'photo', '[]', null, null, null, true, 0, 19, null, null, null, 1, 1, 145),

  ('app-comic', 'fal-ai/nano-banana-pro/edit', 'app', 'comic_cover', 'image_urls', true,
   '{"resolution":"2K","output_format":"jpeg","num_images":1,"aspect_ratio":"2:3","prompt":"Turn the photo into a dynamic comic book cover illustration of the same person, keeping their face and identity recognisable. Bold ink lines, halftone dots, vivid colours, a dramatic heroic pose, an action background with speed lines, and an original title logo at the top reading HERO. No existing characters, publishers or brands."}',
   'Comic Book', 'You on a comic cover', 'Become the hero of your own comic book cover.',
   'fun', 'app', 'image', 'photo', '[]', null, null, null, true, 0, 19, null, null, null, 1, 1, 150),

  ('app-renaissance', 'fal-ai/nano-banana-pro/edit', 'app', 'renaissance', 'image_urls', true,
   '{"resolution":"2K","output_format":"jpeg","num_images":1,"aspect_ratio":"3:4","prompt":"Repaint the person in the photo as a Renaissance oil painting portrait, keeping their face and identity exactly. Rich period clothing, dark background, soft chiaroscuro light, visible brush strokes and fine canvas texture, in an ornate gilded frame. Museum quality."}',
   'Renaissance', 'Classic oil portrait', 'Your portrait as an old-master oil painting in a gilded frame.',
   'fun', 'app', 'image', 'photo', '[]', null, null, null, true, 0, 19, null, null, null, 1, 1, 155),

  ('app-movie-poster', 'fal-ai/nano-banana-pro/edit', 'app', 'movie_poster', 'image_urls', true,
   '{"resolution":"2K","output_format":"jpeg","num_images":1,"aspect_ratio":"2:3","prompt":"Turn the photo into a cinematic movie poster starring the same person, keeping their face and identity exactly. Dramatic lighting, an epic atmospheric background, the person in a heroic pose at the center, an original film title THE LAST LIGHT and a small credits block at the bottom. Professional theatrical one-sheet design. No real actors, studios or brands."}',
   'Movie Poster', 'Star of your own film', 'You on the poster of a blockbuster that does not exist (yet).',
   'fun', 'app', 'image', 'photo', '[]', null, null, null, true, 0, 19, null, null, null, 1, 1, 160),

  ('app-pixel-game', 'fal-ai/nano-banana-pro/edit', 'app', 'pixel_game', 'image_urls', true,
   '{"resolution":"2K","output_format":"jpeg","num_images":1,"aspect_ratio":"1:1","prompt":"Turn the person in the photo into a 16-bit pixel art video game character of themselves, keeping their hairstyle, outfit colours and recognisable features. A side-scrolling platform level in the background, a health bar and score in the corner, crisp retro pixel art and a vibrant palette. Original game, no existing characters or brands."}',
   'Pixel Game', 'You as a game hero', 'Step into a retro 16-bit video game as its hero.',
   'fun', 'app', 'image', 'photo', '[]', null, null, null, true, 0, 19, null, null, null, 1, 1, 165),

  -- ── Products ──
  ('app-product-photo', 'fal-ai/image-apps-v2/product-photography', 'app', 'product_photography', 'product_image_url', false, '{}',
   'Product Photo', 'Studio shot of any product', 'Snap any product: get a clean, professional studio photo of it.',
   'product', 'app', 'image', 'photo', '[]', null, null, null, false, 0, 5,
   'https://v3b.fal.media/files/b/panda/NggkU_5Ne-SB-Ltgr0lbH_b76a99a276374ff9b13f399e57c54cb6.png',
   'https://v3.fal.media/files/tiger/WqtPStHkOu6W0lZcIlXD8_156e3c91cb3a4d12b7380cc43b5e4c67.png',
   null, 1, 1, 170),

  ('app-product-hold', 'fal-ai/image-apps-v2/product-holding', 'app', 'product_holding', 'person_image_url', false, '{}',
   'Product in Hand', 'Ad photo with your product', 'Add a photo of a person and a product: they hold it in a natural ad shot.',
   'product', 'app', 'image', 'photo', '[]', '{"field":"product_image_url","label":"Product photo"}', null, null, false, 0, 5,
   'https://v3b.fal.media/files/b/penguin/JR-DlVO6P28LvnvMU2mu5_7078ec349a194e6c8860cae283bd3a0d.png',
   'https://v3.fal.media/files/panda/oMob58qZJRtbDs5l45QKT_e3a1512c455d425fab2d62e07a51c506.png',
   null, 1, 1, 175),

  -- ── Edit ──
  ('app-erase', 'bria/fibo-edit/erase_by_text', 'app', 'erase_by_text', 'image_url', false, '{}',
   'Object Eraser', 'Remove anything', 'Type what should disappear from the photo: it is removed and the gap filled in.',
   'edit', 'app', 'image', 'photo', '[]', null,
   '{"field":"object_name","label":"What should disappear?","placeholder":"e.g. the table","max":60,"credits_per_char":0,"sample":"table"}',
   null, false, 0, 5, null,
   'https://bria-datasets.s3.us-east-1.amazonaws.com/Liza/an_empty_table_in_living_room.png', null, 1, 1, 180),

  ('app-sketch', 'bria/fibo-edit/sketch_to_colored_image', 'app', 'sketch_to_image', 'image_url', false, '{}',
   'Sketch to Real', 'Drawing → photo', 'Photograph a sketch or line drawing: get a realistic, full-colour image of it.',
   'edit', 'app', 'image', 'photo', '[]', null, null, null, false, 0, 5, null,
   'https://bria-datasets.s3.us-east-1.amazonaws.com/Liza/create_a_b_w_sketch_of_a_cat.png', null, 1, 1, 185),

  ('app-colorize', 'bria/fibo-edit/colorize', 'app', 'colorize', 'image_url', false, '{}',
   'Colorize', 'Bring old photos to colour', 'Turns black-and-white photos into natural colour, or gives any photo a vintage look.',
   'edit', 'app', 'image', 'photo',
   '[{"field":"color","label":"Look","default":"contemporary color","options":[
      {"value":"contemporary color","label":"Natural"},{"value":"vivid color","label":"Vivid"},{"value":"sepia vintage","label":"Sepia vintage"}]}]',
   null, null, null, false, 0, 5, null,
   'https://bria-datasets.s3.us-east-1.amazonaws.com/Liza/png+-+2026-01-13T083840.113.png', null, 1, 1, 190)
on conflict (id) do nothing;
