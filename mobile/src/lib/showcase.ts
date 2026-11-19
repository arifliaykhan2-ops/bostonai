import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from './supabase';

/**
 * Endless Explore feed: trending PG community creations from Civitai with their
 * full prompt, mapped to our closest model. Pages come from the showcase-feed
 * Edge Function, which applies the safety + remix rules server-side.
 */
export type ShowcaseItem = {
  id: string;
  source: string;
  media_type: 'image' | 'video';
  media_url: string;
  preview_url: string | null;
  preview_video_url: string | null;
  width: number | null;
  height: number | null;
  prompt: string;
  negative_prompt: string | null;
  base_model: string | null;
  model_id: string | null;
  author: string | null;
  source_url: string;
  likes: number;
};

/** all/video/image: photoreal, people first. anime: anime, cartoon & illustration. */
export type FeedFilter = 'all' | 'video' | 'image' | 'anime';

type FeedState = {
  items: ShowcaseItem[];
  cursor: string | null;
  done: boolean;
  loading: boolean;
  error: string | null;
};

// ── Module-level store: one list per filter, shared by every screen ──

const feeds = new Map<FeedFilter, FeedState>();
const byId = new Map<string, ShowcaseItem>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getVersion = () => version;

const stateOf = (f: FeedFilter): FeedState =>
  feeds.get(f) ?? { items: [], cursor: null, done: false, loading: false, error: null };

async function loadPage(filter: FeedFilter) {
  const current = stateOf(filter);
  if (current.loading || current.done) return;
  feeds.set(filter, { ...current, loading: true, error: null });
  emit();

  const { data, error } = await supabase.functions.invoke<{ items: ShowcaseItem[]; nextCursor: string | null }>(
    'showcase-feed',
    { body: { filter, cursor: current.cursor ?? undefined } },
  );

  const prev = stateOf(filter);
  if (error || !data) {
    feeds.set(filter, { ...prev, loading: false, error: error?.message ?? 'Could not load the feed' });
  } else {
    const known = new Set(prev.items.map((i) => i.id));
    const fresh = data.items.filter((i) => !known.has(i.id));
    fresh.forEach((i) => byId.set(i.id, i));
    feeds.set(filter, {
      items: [...prev.items, ...fresh],
      cursor: data.nextCursor,
      done: !data.nextCursor,
      loading: false,
      error: null,
    });
  }
  emit();
}

/** Paged feed for one filter. Call `loadMore` when the user nears the end. */
export function useShowcaseFeed(filter: FeedFilter) {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  const state = stateOf(filter);

  useEffect(() => {
    if (!feeds.has(filter)) void loadPage(filter);
  }, [filter]);

  const loadMore = useCallback(() => void loadPage(filter), [filter]);
  const refresh = useCallback(async () => {
    feeds.delete(filter);
    await loadPage(filter);
  }, [filter]);

  return {
    items: state.items,
    loading: state.loading && state.items.length === 0,
    loadingMore: state.loading && state.items.length > 0,
    hasMore: !state.done,
    error: state.error,
    loadMore,
    refresh,
  };
}

/** A single item: from any loaded page, or fetched directly (deep links, app restarts). */
export function useShowcaseItem(id: string | undefined) {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  const cached = id ? byId.get(id) : undefined;
  const [loading, setLoading] = useState(!cached && !!id);

  useEffect(() => {
    if (!id || byId.has(id)) return;
    let alive = true;
    setLoading(true);
    supabase.functions
      .invoke<{ item: ShowcaseItem | null }>('showcase-feed', { body: { id } })
      .then(({ data }) => {
        if (data?.item) {
          byId.set(id, data.item);
          emit();
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  return { item: cached, loading: loading && !cached };
}

/** Aspect ratio for bento tiles, clamped so extreme panoramas stay readable. */
export function tileAspect(item: ShowcaseItem): number {
  if (!item.width || !item.height) return 3 / 4;
  return Math.min(1.4, Math.max(0.56, item.width / item.height));
}
