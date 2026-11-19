-- Apps tab: replace the fal.ai marketing thumbnails (abstract art that does not
-- show what the tool does) with each endpoint's own example from its OpenAPI
-- schema on fal.ai: poster_url = the example result, before_url = the example
-- input photo. Video apps also get the example result clip as preview_url.
--
-- Expand keeps its old poster: fal's example shows a branded handbag.

alter table public.effects add column if not exists before_url text;

update public.effects as e
set poster_url = v.poster_url,
    before_url = v.before_url,
    preview_url = coalesce(v.preview_url, e.preview_url)
from (values
  ('app-talking-photo',
   'https://storage.googleapis.com/falserverless/example_inputs/kling_ai_avatar_input.jpg',
   null,
   'https://v3.fal.media/files/penguin/ln3x7H1p1jL0Pwo7675NI_output.mp4'),
  ('app-recast',
   'https://v3b.fal.media/files/b/panda/-oMlZo9Yyj_Nzoza_tgds_GmLF86r5bOt50eMMKCszy_eacc949b3933443c9915a83c98fbe85e.png',
   null,
   'https://v3b.fal.media/files/b/elephant/9Ofgiju3Peb3b5hriTuBH_wan_animate_output.mp4'),
  ('app-photoshoot',
   'https://storage.googleapis.com/falserverless/example_outputs/nano-banana-pro-edit-output.png',
   'https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input.png',
   null),
  ('app-relight',
   'https://v3b.fal.media/files/b/penguin/TD0yR-XgXfyZjSjKcxKWS_4a54a0fb769d4a60bf6818fffed70493.png',
   'https://v3.fal.media/files/monkey/tugG2Q-XqMgf_ZoBr8KFO.jpeg',
   null),
  ('app-headshot',
   'https://v3b.fal.media/files/b/penguin/n2f6ImUI9nJORdIibmpim_dfaeb84b0e894f62ae50ccaceb9704d3.png',
   'https://v3.fal.media/files/panda/oMob58qZJRtbDs5l45QKT_e3a1512c455d425fab2d62e07a51c506.png',
   null),
  ('app-skin',
   'https://v3b.fal.media/files/b/tiger/Re4QHcI-z3a1RNUssE9s3_ac63f107bd714cccb9060e2a5c8f999f.png',
   'https://v3b.fal.media/files/b/monkey/VszUszGx2uzReqFvQzF26.jpg',
   null),
  ('app-hair',
   'https://v3b.fal.media/files/b/rabbit/nuRb4Pn6U-Pryrd2LPI6I_1bcc7ca071a1483faeba2d159952c7f8.png',
   'https://v3.fal.media/files/zebra/1ois7lqES78dLualcytmS_1e088ef24f474972824cffcfdd7ff291.png',
   null),
  ('app-age',
   'https://v3b.fal.media/files/b/monkey/lPoI9oYu6X_I1SvqOurj0_ce7daf32a7a146f9a627c0578bd4a747.png',
   'https://v3.fal.media/files/lion/s2GShUC7AB9i-ypYV0DbI_1b5ca4fe5d7e477fb4501acf9a1c43bc.png',
   null),
  ('app-expression',
   'https://v3b.fal.media/files/b/lion/evrtcIw4fzjESvKi7Unup_781b90e31d864eb0ad4f5ef59160ebc4.png',
   'https://v3.fal.media/files/kangaroo/Gk5_0En-p1CNYnGOCDkl1_8332b944f8334ba9b3118b49e3e641cf.png',
   null),
  ('app-makeup',
   'https://v3b.fal.media/files/b/tiger/nFRi9Cemv4B5-felhf4iu_5c34cfde265443f897463f5b29b6c0b9.png',
   'https://v3.fal.media/files/elephant/jpdD30YLw3OfPdVDxq1-D_1ec2e27f3e7d400fbf5f7aa2b80e89f0.png',
   null),
  ('app-tryon',
   'https://v3b.fal.media/files/b/panda/9w6wt7vgxjfmiBIoo6bjF_cb0ba7a150c84f159e9d40af2d439401.png',
   'https://v3.fal.media/files/tiger/4vxSHizex4UWR5fdnPs1A.jpeg',
   null),
  ('app-style',
   'https://v3b.fal.media/files/b/koala/LX3BVXfDxE_3qgqH4YL3P_d89afb41867b4a698d29b6308d610dc1.png',
   'https://v3.fal.media/files/tiger/vAohCtb_N8Q_cAs9Z03GS.jpeg',
   null),
  ('app-angles',
   'https://v3b.fal.media/files/b/elephant/0lEToxR8cU5tB-SVMmD2C.png',
   'https://v3.fal.media/files/monkey/i3saq4bAPXSIl08nZtq9P_ec535747aefc4e31943136a6d8587075.png',
   null),
  ('app-bg-remove',
   'https://cdn3.pixelcut.app/fal/background-remover/portrait_result.png',
   'https://cdn3.pixelcut.app/fal/background-remover/portrait.jpg',
   null),
  ('app-restore',
   'https://v3b.fal.media/files/b/zebra/grrkysWir2bvFTnubydQK_92e56e5831994be59e653611983d503f.png',
   'https://v3.fal.media/files/panda/BcOIyOJ5Z1-GOjDi_GmsX_50e353c588c74435882f8f68989b4af5.png',
   null)
) as v(id, poster_url, before_url, preview_url)
where e.id = v.id;
