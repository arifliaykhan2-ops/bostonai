import { t } from '@/i18n';
import { useEffect, useState } from 'react';
import type { ImageSlot, ParamSpec, PricingInfo } from './pricing';
import { supabase } from './supabase';

/**
 * The model list lives in Supabase (public.models), filled from fal.ai by the
 * sync-models function — new models appear without an app update. There is
 * deliberately no hard-coded fallback: a stale copy would show wrong prices
 * and photo slots the server rejects.
 */
export type GenKind = 'image' | 'video';
/** What the Create screen's top switch shows. */
export type CreateMode = 'video' | 'image' | 'edit';

export type ModelInfo = {
  id: string; // fal endpoint id
  kind: GenKind;
  name: string;
  description: string | null;
  credits: number; // at default settings
  needs_image: boolean;
  is_edit: boolean;
  thumbnail_url: string | null;
  example_url: string | null;
  params: ParamSpec[];
  image_slots: ImageSlot[];
  pricing: PricingInfo;
};

const COLUMNS =
  'id, kind, name, description, credits, needs_image, is_edit, thumbnail_url, example_url, params, image_slots, pricing';

let cache: ModelInfo[] | null = null;
let inflight: Promise<ModelInfo[]> | null = null;

async function loadModels(): Promise<ModelInfo[]> {
  const read = () => supabase.from('models').select(COLUMNS).eq('enabled', true).order('sort');
  const { data, error } = await read();
  if (error) throw error;
  if (data?.length) return data as ModelInfo[];
  // Empty catalog (fresh project) — ask the server to sync it once, then re-read.
  await supabase.functions.invoke('sync-models', { method: 'POST' }).catch(() => undefined);
  return ((await read()).data as ModelInfo[] | null) ?? [];
}

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) return;
    inflight ??= loadModels().finally(() => {
      inflight = null;
    });
    inflight
      .then((m) => {
        cache = m;
        setModels(m);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return { models, loading, error };
}

export function modeOf(m: ModelInfo): CreateMode {
  if (m.kind === 'video') return 'video';
  return m.is_edit ? 'edit' : 'image';
}

/** Short label shown on model cards. */
export function modelMode(m: ModelInfo): string {
  if (m.kind === 'image') return m.is_edit ? t('catalog.photoEdit') : t('catalog.textToImage');
  return m.needs_image ? t('catalog.photoToVideo') : t('catalog.textToVideo');
}

export const isVideoUrl = (url: string) => /\.(mp4|mov|webm)(\?|$)/i.test(url);
