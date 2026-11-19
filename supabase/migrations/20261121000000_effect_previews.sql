-- Example videos for trend templates, taken from Vidu's public template
-- catalog (platform.vidu.com/docs/templates) instead of rendering our own.
-- They are linked from Vidu's CDN, not copied. Replace them with our own
-- renders (seed-effect-previews) once there's budget for it.
--
-- PixVerse and Kling have no public per-effect demo videos, so their
-- templates are hidden until we render examples; Vidu templates replace them.

update public.effects set enabled = false where endpoint <> 'fal-ai/vidu/template-to-video';

insert into public.effects (id, endpoint, field, value, image_field, image_array, extra, title, subtitle, category, credits, sort) values
  ('vidu-hug-behind',    'fal-ai/vidu/template-to-video', 'template', 'hug_from_behind',      'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Hug from Behind', 'Photo with 2 people',  'couples',   38, 0),
  ('vidu-romantic-lift', 'fal-ai/vidu/template-to-video', 'template', 'romantic_lift',        'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Romantic Lift',   'Photo with 2 people',  'couples',   38, 0),
  ('vidu-liquid-metal',  'fal-ai/vidu/template-to-video', 'template', 'covered_liquid_metal', 'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Liquid Metal',    'Photo of one person',  'fx',        38, 0),
  ('vidu-break-glass',   'fal-ai/vidu/template-to-video', 'template', 'break_glass',          'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Break the Glass', 'Photo of one person',  'fx',        38, 0),
  ('vidu-jump-cloud',    'fal-ai/vidu/template-to-video', 'template', 'jump_to_cloud',        'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Jump to Cloud',   'Full-body photo',      'fx',        38, 0),
  ('vidu-star-carpet',   'fal-ai/vidu/template-to-video', 'template', 'star_carpet',          'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Red Carpet',      'Full-body photo',      'transform', 38, 0),
  ('vidu-fairy-me',      'fal-ai/vidu/template-to-video', 'template', 'fairy_me',             'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Fairy Me',        'Photo of one person',  'transform', 38, 0),
  ('vidu-hitchcock',     'fal-ai/vidu/template-to-video', 'template', 'hitchcock_zoom',       'input_image_urls', true, '{"aspect_ratio":"9:16"}', 'Hitchcock Zoom',  'Photo of one person',  'camera',    38, 0);

-- Order: couples and people-centric effects first.
update public.effects as e set preview_url = v.preview, poster_url = v.poster, sort = v.sort
from (values
  ('vidu-hug',           10,  'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Festival/Festival/0325_com/0325_com/couplehug_video.mp4',          'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Festival/Festival/0325_com/0325_com/couplehug_cover.png'),
  ('vidu-cheek-kiss',    20,  'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Interactive/Interactive/cheekkiss_0530/cheekkiss_video.mp4',       'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Interactive/Interactive/cheekkiss_0530/cheekkiss_cover.png'),
  ('vidu-hug-behind',    30,  'https://scene.cf.vidu.studio/media-asset/025531-mGf9DMM6YnMWNpeV.mp4',                                                          'https://scene.cf.vidu.studio/media-asset/025520-quItLW3VXL6fxTLD.png'),
  ('vidu-romantic-lift', 40,  'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Festival/Festival/qingrenjie/lanmangongzhubao_video.mp4',           'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Festival/Festival/qingrenjie/lanmangongzhubao_cover.png'),
  ('vidu-carry-me',      50,  'https://scene.cf.vidu.studio/media-asset/073147-mu3k87NOYPHi771w.mp4',                                                          'https://scene.cf.vidu.studio/media-asset/080036-F4uS1VYMEaqNJ8RM.png'),
  ('vidu-flying',        60,  'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Funny/Funny/0317/flying_video.mp4',                                  'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Funny/Funny/0317/flying_cover.png'),
  ('vidu-grow-wings',    70,  'https://scene.cf.vidu.studio/media-asset/031957-qe85DbVs5M4x1zxX.mp4',                                                          'https://scene.cf.vidu.studio/media-asset/031945-JkSgWrBwXgV846hN.png'),
  ('vidu-star-carpet',   80,  'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Portrait/xingguanghongtan_video.mp4',                                'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Portrait/xingguanghongtan_cover.png'),
  ('vidu-runway',        90,  'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Portrait/shishangTtai_video.mp4',                                    'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Portrait/shishangTtai_cover.png'),
  ('vidu-liquid-metal',  100, 'https://scene.vidu.zone/media-asset/065209-VVDyxKBPkRK1Khpl.mp4',                                                               'https://scene.vidu.zone/media-asset/084529-MzVgFk098HHIcF6p.png'),
  ('vidu-clone',         110, 'https://scene.cf.vidu.studio/media-asset/035607-alTb3VGehE1xz9GD.mp4',                                                          'https://scene.cf.vidu.studio/media-asset/035550-taXw8XlrRLyD6d79.png'),
  ('vidu-muscle',        120, 'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Transformation/bianshenjirounan_viseo.mp4',                         'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Transformation/bianshenjirounan_cove.jpeg'),
  ('vidu-fairy-me',      130, 'https://scene.cf.vidu.studio/media-asset/093224-to1zJlVf2Po5EYVW.mp4',                                                          'https://scene.cf.vidu.studio/media-asset/093015-xMsg0YFaSXtvFl5U.png'),
  ('vidu-earth-zoom',    140, 'https://scene.cf.vidu.studio/media-asset/021251-GH44SEj4C0rmLXzw.mp4',                                                          'https://scene.cf.vidu.studio/media-asset/100904-kE2UjcnVNg1zAXip.png'),
  ('vidu-hair-color',    150, 'https://scene.cf.vidu.studio/media-asset/035829-7E2y0F53gBHMWk1K.mp4',                                                          'https://scene.cf.vidu.studio/media-asset/035752-6sLm2eg0UtW4OyRc.png'),
  ('vidu-break-glass',   160, 'https://scene.vidu.zone/media-asset/062104-iyz5MbzUAFkwQzSL.mp4',                                                               'https://scene.vidu.zone/media-asset/063438-aJRQXgMPmqSBOevH.png'),
  ('vidu-jump-cloud',    170, 'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Festival/Festival/jumptocloud_0516/jumptocloud_video.mp4',           'https://image01.cf.vidu.studio/vidu-maas/Tempmates_material/Festival/Festival/jumptocloud_0516/jumptocloud_cover.png'),
  ('vidu-hitchcock',     180, 'https://scene.cf.vidu.studio/media-asset/060931-q3lMQtKDtA2Mk97w.mp4',                                                          'https://scene.cf.vidu.studio/media-asset/060921-uDufb31fbsp876qS.png')
) as v(id, sort, preview, poster)
where e.id = v.id;
