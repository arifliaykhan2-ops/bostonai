// Endless Explore feed: proxies Civitai's public images API page by page,
// applying the same safety + remix rules as sync-showcase (_shared/showcaseMap).
//
//   POST { filter: all|video|image, cursor? }   → { items, nextCursor }
//   POST { id: "civitai:<n>" }                  → { item }  (detail deep links)
// Requires a signed-in (or guest) user's JWT so it can't be used as an open proxy.
//
// The cursor walks Week → Month → AllTime "Most Reactions", so the feed keeps
// going after this week's top posts run out.
import { feedRank, styleOf, toShowcaseRow, type CivitaiItem, type FeedStyle, type ShowcaseRow } from '../_shared/showcaseMap.ts';
import { admin, corsHeaders, json } from '../_shared/http.ts';

/** all/video/image show photoreal posts (people first); anime has its own tab. */
type Filter = 'all' | 'video' | 'image' | 'anime';
type Period = 'Week' | 'Month' | 'AllTime';
const PERIODS: Period[] = ['Week', 'Month', 'AllTime'];

/** Per media type: which period we're in and Civitai's cursor within it. */
type Lane = { p: number; c?: string; done?: boolean };
type Cursor = { video?: Lane; image?: Lane; seen?: number[] };

const PAGE = 100; // Civitai page size; roughly half survive the filters
const TARGET = 36; // items to return per call

const encode = (c: Cursor) => btoa(JSON.stringify(c));
const decode = (s: string | null): Cursor => {
  if (!s) return {};
  try {
    return JSON.parse(atob(s)) as Cursor;
  } catch {
    return {};
  }
};

let modelCache: { ids: Set<string>; at: number } | null = null;
async function availableModels(): Promise<Set<string>> {
  if (modelCache && Date.now() - modelCache.at < 10 * 60 * 1000) return modelCache.ids;
  const { data } = await admin.from('models').select('id').eq('enabled', true);
  modelCache = { ids: new Set((data ?? []).map((m: { id: string }) => m.id)), at: Date.now() };
  return modelCache.ids;
}

async function civitai(params: Record<string, string>) {
  const qs = new URLSearchParams({ browsingLevel: '1', withMeta: 'true', ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://civitai.com/api/v1/images?${qs}`, {
      headers: { 'User-Agent': 'BosonAI-feed/1.0' },
    });
    if (res.ok) return (await res.json()) as { items?: CivitaiItem[]; metadata?: { nextCursor?: string } };
    if (res.status !== 503 && res.status !== 429) throw new Error(`civitai ${res.status}`);
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error('civitai unavailable');
}

/** Pulls pages for one media type until `want` rows pass the filters or the lane ends. */
async function fillLane(
  type: 'video' | 'image',
  lane: Lane,
  want: number,
  available: Set<string>,
  seen: Set<number>,
  style: FeedStyle,
) {
  const out: ShowcaseRow[] = [];
  let calls = 0;
  while (out.length < want && !lane.done && calls < 4) {
    calls++;
    const body = await civitai({
      type,
      sort: 'Most Reactions',
      period: PERIODS[lane.p],
      limit: String(PAGE),
      ...(lane.c ? { cursor: lane.c } : {}),
    });
    for (const it of body.items ?? []) {
      if (seen.has(it.id)) continue; // the same post appears in Week, Month and AllTime
      seen.add(it.id);
      const row = toShowcaseRow(it, available);
      if (typeof row !== 'string' && styleOf(row) === style) out.push(row);
    }
    if (body.metadata?.nextCursor) lane.c = body.metadata.nextCursor;
    else if (lane.p < PERIODS.length - 1) lane = Object.assign(lane, { p: lane.p + 1, c: undefined });
    else lane.done = true;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  // Params come in the JSON body (POST, what supabase.functions.invoke sends) or the query string.
  const body = req.method === 'POST' ? ((await req.json().catch(() => ({}))) as Record<string, string | undefined>) : {};
  const param = (k: string) => body[k] ?? url.searchParams.get(k);
  const available = await availableModels();

  try {
    const id = param('id');
    if (id) {
      const num = id.replace(/^civitai:/, '');
      if (!/^\d+$/.test(num)) return json({ error: 'bad_id' }, 400);
      const one = await civitai({ imageId: num, limit: '1' });
      const it = one.items?.[0];
      const row = it ? toShowcaseRow(it, available) : 'noPrompt';
      return typeof row === 'string' ? json({ item: null }) : json({ item: row });
    }

    const rawFilter = param('filter');
    const filter: Filter =
      rawFilter === 'video' || rawFilter === 'image' || rawFilter === 'anime' ? rawFilter : 'all';
    const cursor = decode(param('cursor'));
    // Remember recent ids across pages so period switches don't repeat posts.
    const seen = new Set<number>(cursor.seen ?? []);
    const lanes = { video: cursor.video ?? { p: 0 }, image: cursor.image ?? { p: 0 } };
    const style: FeedStyle = filter === 'anime' ? 'anime' : 'real';
    const byRank = (a: ShowcaseRow, b: ShowcaseRow) => feedRank(a) - feedRank(b);

    let items: ShowcaseRow[];
    if (filter === 'all' || filter === 'anime') {
      // Videos lead: 2/3 of each page is video.
      const [v, i] = await Promise.all([
        fillLane('video', lanes.video, Math.round((TARGET * 2) / 3), available, seen, style),
        fillLane('image', lanes.image, Math.round(TARGET / 3), available, seen, style),
      ]);
      // Main feed: people videos → photoreal videos → other videos → people images → images.
      items = filter === 'all' ? [...v, ...i].sort(byRank) : [...v, ...i];
    } else {
      items = (await fillLane(filter, lanes[filter], TARGET, available, seen, style)).sort(byRank);
    }

    const exhausted =
      filter === 'all' || filter === 'anime' ? lanes.video.done && lanes.image.done : lanes[filter].done;
    const next: Cursor = { video: lanes.video, image: lanes.image, seen: [...seen].slice(-1500) };
    return json(
      { items, nextCursor: exhausted ? null : encode(next) },
      200,
    );
  } catch (e) {
    console.error('feed failed', e);
    return json({ error: 'upstream_error' }, 502);
  }
});
