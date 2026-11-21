-- Free examples for the apps added in 20261201000000_more_apps.sql, instead of
-- rendering them on fal (seed-effect-previews still renders whatever stays null).
--
--   Camera apps        the matching Vidu / Kling demo clip already used on Home
--                      (Bullet Time poster: a frame of the Kling clip, in our bucket)
--   3D Figure / Plush  covers of Vidu's "Emoji figure" and "Cartoon doll" templates
--   Comic Book         cover of Vidu's "American Comic" template
--   Renaissance        Raphael, La Donna Velata (1516, public domain, Wikimedia Commons)
--   Object Eraser      fal's image-apps-v2/object-removal example (backpack removed)
--   Colorize           fal's photo-restoration example (sepia → colour), as on Restore
--
-- Face Swap, Pixel Game, Movie Poster and Sketch to Real keep no poster for now:
-- the Apps tab shows a placeholder until seed-effect-previews renders them.

update public.effects as e
set poster_url = v.poster_url,
    before_url = coalesce(v.before_url, e.before_url),
    preview_url = coalesce(v.preview_url, e.preview_url)
from (values
  ('app-bullet-time',
   'https://xyyaouivoiuqohuuiqne.supabase.co/storage/v1/object/public/effect-previews/apps/bullet-time.jpg',
   null,
   'https://v15-kling.klingai.com/kos/s101/nlav112372/kling-op/effects_video/bullet_time_360.mp4'),
  ('app-crash-zoom',
   'https://scene.cf.vidu.studio/media-asset/060921-uDufb31fbsp876qS.png',
   null,
   'https://scene.cf.vidu.studio/media-asset/060931-q3lMQtKDtA2Mk97w.mp4'),
  ('app-orbit',
   'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Dynamic/360xuanzhuan_cover.png',
   null,
   'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Dynamic/Dynamic/360xuanzhuan_video.mp4'),
  ('app-behind-scenes',
   'https://v15-kling.klingai.com/kos/s101/nlav112372/kling-op/effects_cover/zoom_out.png',
   null,
   'https://v15-kling.klingai.com/kos/s101/nlav112372/kling-op/effects_video/zoom_out.mp4'),
  ('app-figure',
   'https://scene.cf.vidu.studio/media-asset/015429-5hRSbMuZLnpjkXNp.png', null, null),
  ('app-plush',
   'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Transformation/0317/Qwanou_cover.png', null, null),
  ('app-comic',
   'https://scene.cf.vidu.studio/media-asset/081734-26TF3Pvqvvl8UFVX.png', null, null),
  ('app-renaissance',
   'https://xyyaouivoiuqohuuiqne.supabase.co/storage/v1/object/public/effect-previews/apps/renaissance.jpg', null, null),
  ('app-erase',
   'https://v3b.fal.media/files/b/rabbit/InVOEtkI_yl05dSz9bqiU_789bdf6c81fc4c75bdcc57bad744f389.png',
   'https://v3.fal.media/files/zebra/L_YMy6H5r_HYMacZX1qne_74a8fb6130164a18930af55370a1c9b2.png',
   null),
  ('app-colorize',
   'https://v3b.fal.media/files/b/zebra/grrkysWir2bvFTnubydQK_92e56e5831994be59e653611983d503f.png',
   'https://v3.fal.media/files/panda/BcOIyOJ5Z1-GOjDi_GmsX_50e353c588c74435882f8f68989b4af5.png',
   null)
) as v(id, poster_url, before_url, preview_url)
where e.id = v.id;

-- The eraser example now shows a removed backpack.
update public.effects
set text_input = jsonb_set(text_input, '{placeholder}', '"e.g. the backpack"') || '{"sample":"backpack"}'
where id = 'app-erase';
