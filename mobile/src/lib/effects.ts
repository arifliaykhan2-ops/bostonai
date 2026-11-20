import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { tMaybe } from '@/i18n';
import { supabase } from './supabase';
import type { TextInput } from '../../../supabase/functions/_shared/effects';

// Same price formula as the server (generate) — one source of truth.
export { effectCost, type TextInput } from '../../../supabase/functions/_shared/effects';

/**
 * public.effects: Home trend templates (photo → video), Apps tools (photo → image)
 * and result actions (Upscale, Add sound). The server re-reads the row on
 * generate, so the price shown here is the price charged. Newest first.
 */
export type Choice = {
  field: string;
  label: string;
  default: string | number;
  options: { value: string | number; label: string }[];
};

export type Effect = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  credits: number;
  preview_url: string | null;
  poster_url: string | null;
  /** Apps: the example input photo, shown small beside the result (poster_url). */
  before_url: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  sort: number;
  section: 'trend' | 'app' | 'action';
  kind: 'video' | 'image';
  input_kind: 'photo' | 'job_image' | 'job_video';
  choices: Choice[];
  image2: { field: string; label: string } | null;
  description: string | null;
  text_input: TextInput | null;
  requires_consent: boolean;
  more_photos: number;
  video_input: { field: string; label: string; max_seconds: number } | null;
};

type State = { items: Effect[]; loading: boolean; error: string | null; loaded: boolean };

let state: State = { items: [], loading: false, error: null, loaded: false };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;

async function load() {
  if (state.loading) return;
  set({ loading: true, error: null });
  const { data, error } = await supabase
    .from('effects')
    .select(
      'id, title, subtitle, category, credits, preview_url, poster_url, before_url, width, height, created_at, sort, section, kind, input_kind, choices, image2, description, text_input, requires_consent, more_photos, video_input',
    )
    .eq('enabled', true)
    .order('created_at', { ascending: false })
    .order('sort');
  if (error) set({ loading: false, error: error.message });
  else set({ loading: false, loaded: true, items: (data ?? []) as Effect[] });
}

/** Asks the server to pick up templates fal.ai added since; reloads if it found any. */
async function syncNewTemplates() {
  const { data } = await supabase.functions
    .invoke<{ added?: string[] }>('sync-effects', { method: 'POST' })
    .catch(() => ({ data: null }));
  if (data?.added?.length) await load();
}

/** Every enabled row (all sections), loaded once and shared by every screen. */
function useAllEffects() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!state.loaded && !state.loading) {
      void load();
      void syncNewTemplates();
    }
  }, []);
  return { all: s.items, loading: s.loading && !s.loaded, error: s.error, reload: load };
}

/** Home feed: trend templates, newest first. */
export function useEffects() {
  const { all, ...rest } = useAllEffects();
  const effects = useMemo(() => all.filter((e) => e.section === 'trend'), [all]);
  return { effects, ...rest };
}

/** Apps tab tools, in their curated order. */
export function useApps() {
  const { all, ...rest } = useAllEffects();
  const apps = useMemo(() => all.filter((e) => e.section === 'app').sort((a, b) => a.sort - b.sort), [all]);
  return { apps, ...rest };
}

/** Actions that can run on a finished job of this kind (Upscale, Add sound). */
export function useJobActions(kind: 'image' | 'video') {
  const { all } = useAllEffects();
  return useMemo(
    () => all.filter((e) => e.section === 'action' && e.input_kind === (kind === 'video' ? 'job_video' : 'job_image')),
    [all, kind],
  );
}

/** Any row by id: template, app or action. */
export function useEffectById(id: string | undefined) {
  const { all, loading } = useAllEffects();
  return { effect: all.find((e) => e.id === id), loading };
}

/** Width / height of the demo clip, clamped so extreme shapes stay readable. */
export function effectAspect(e: Pick<Effect, 'width' | 'height'>): number {
  if (!e.width || !e.height) return 9 / 16;
  return Math.min(16 / 9, Math.max(9 / 16, e.width / e.height));
}

/** Effect id from a job's preset_id ("effect:vidu-hug"), if the job came from a template. */
export const effectIdOfJob = (presetId: string | null) =>
  presetId?.startsWith('effect:') ? presetId.slice('effect:'.length) : null;

/** Same as optionKey() in scripts/translate.mjs: long values (prompt texts) become a short hash. */
function optionKey(value: string | number): string {
  const v = String(value);
  if (v.length <= 40) return v;
  let h = 5381;
  for (let i = 0; i < v.length; i++) h = ((h * 33) ^ v.charCodeAt(i)) >>> 0;
  return `h${h.toString(36)}`;
}

/**
 * Translated text of an app / action row (keys fx.<id>.* in the locale files, made by
 * scripts/translate.mjs from the database). Trend templates and rows added since the
 * last translation run fall back to the English text from the database.
 */
export const fx = {
  title: (e: Effect) => tMaybe(`fx.${e.id}.title`, e.title),
  subtitle: (e: Effect) => (e.subtitle ? tMaybe(`fx.${e.id}.subtitle`, e.subtitle) : null),
  description: (e: Effect) => (e.description ? tMaybe(`fx.${e.id}.description`, e.description) : null),
  choiceLabel: (e: Effect, c: Choice) => tMaybe(`fx.${e.id}.${c.field}`, c.label),
  optionLabel: (e: Effect, c: Choice, o: Choice['options'][number]) =>
    tMaybe(`fx.${e.id}.${c.field}.${optionKey(o.value)}`, o.label),
  image2Label: (e: Effect) => (e.image2 ? tMaybe(`fx.${e.id}.image2`, e.image2.label) : ''),
  videoLabel: (e: Effect) => (e.video_input ? tMaybe(`fx.${e.id}.video`, e.video_input.label) : ''),
  textLabel: (e: Effect) => (e.text_input ? tMaybe(`fx.${e.id}.text`, e.text_input.label) : ''),
  textPlaceholder: (e: Effect) => (e.text_input ? tMaybe(`fx.${e.id}.placeholder`, e.text_input.placeholder ?? '') : ''),
};
