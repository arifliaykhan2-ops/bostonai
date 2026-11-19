-- Kling effects lead the Home feed (newest first): one day newer than the
-- Vidu batch. Templates sync-effects adds later (created_at = now()) still go above both.
update public.effects
   set created_at = '2026-11-02'
 where endpoint = 'fal-ai/kling-video/v1.6/pro/effects';
