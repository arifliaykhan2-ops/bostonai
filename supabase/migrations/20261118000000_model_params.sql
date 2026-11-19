-- Per-model user options (duration, aspect ratio, resolution, audio, …),
-- photo slots (start/end frame, edit references) and pricing inputs, all
-- derived from fal.ai by sync-models. Jobs remember the options used.

alter table public.models
  add column params      jsonb not null default '[]',  -- ParamSpec[]  (supabase/functions/_shared/pricing.ts)
  add column image_slots jsonb not null default '[]',  -- ImageSlot[]
  add column pricing     jsonb not null default '{}',  -- PricingInfo
  add column is_edit     boolean not null default false;

alter table public.jobs
  add column params      jsonb not null default '{}',
  add column input_paths jsonb not null default '{}';  -- slot key → storage path
