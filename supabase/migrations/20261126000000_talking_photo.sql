-- Talking Photo: photo + a short script → ElevenLabs voice → Kling AI Avatar video.
--
--   text_input  { field, label, placeholder, max, credits_per_char, consent }
--               The user types a script; price = credits + ceil(chars × credits_per_char).
--               consent: the user must confirm the photo is them or that they have permission.
--   tts         { endpoint, text_field, voice_field, audio_field }
--               Server speaks the script first (sync fal call) and passes the audio URL
--               to the main endpoint as `audio_field`.
--   Choices whose field starts with "__" are for the server (e.g. the voice), not the main endpoint.
--
-- Price: Kling AI Avatar v2 Standard $0.0562/s; speech ≈ 12 chars/s → $0.00468/char,
-- ElevenLabs v3 $0.0001/char; × 1.25 / $0.01 ≈ 0.6 credits/char, plus a 10-credit floor.

alter table public.effects
  add column if not exists text_input jsonb,
  add column if not exists tts        jsonb;

insert into public.effects
  (id, endpoint, field, value, image_field, image_array, extra, title, subtitle, description, category, section, kind, input_kind,
   choices, text_input, tts, credits, poster_url, width, height, sort)
values
  ('app-talking-photo', 'fal-ai/kling-video/ai-avatar/v2/standard', 'app', 'ai_avatar', 'image_url', false, '{"prompt":"."}',
   'Talking Photo', 'Make a photo speak',
   'Type what they should say, pick a voice: the photo comes alive and talks. Works in many languages.',
   'face', 'app', 'video', 'photo',
   '[{"field":"__voice","label":"Voice","default":"Sarah","options":[
      {"value":"Sarah","label":"Sarah · warm"},{"value":"Aria","label":"Aria · expressive"},{"value":"Jessica","label":"Jessica · young"},
      {"value":"George","label":"George · warm"},{"value":"Brian","label":"Brian · deep"},{"value":"Liam","label":"Liam · young"}]}]',
   '{"field":"__text","label":"What should they say?","placeholder":"Hi! This is me, talking with AI…","max":240,"credits_per_char":0.6,"consent":true}',
   '{"endpoint":"fal-ai/elevenlabs/tts/eleven-v3","text_field":"text","voice_field":"voice","audio_field":"audio_url"}',
   10, 'https://v3b.fal.media/files/b/0a84f39a/V_Zy58fLpOlS1jN3balTm_bf4c62c984b34a1597340c007fac8fe8.jpg', 1, 1, 5)
on conflict (id) do nothing;
