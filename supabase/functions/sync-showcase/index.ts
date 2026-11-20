// Refreshes public.showcase from Civitai's public API: this week's most-reacted
// PG videos and images that include their prompt, mapped to our models.
// Public like sync-models: it only reads public data, gated by freshness.
import { toShowcaseRow, type CivitaiItem } from '../_shared/showcaseMap.ts';
import { hiddenShowcaseIds } from '../_shared/blocked.ts';
import { admin, corsHeaders, json } from '../_shared/http.ts';

const FRESH_MS = 3 * 60 * 60 * 1000;
const PER_TYPE = 40;

async function fetchCivitai(type: 'video' | 'image'): Promise<CivitaiItem[]> {
  const out: CivitaiItem[] = [];
  let cursor: string | undefined;
  // Up to 3 pages: many posts lack a prompt or fail the safety filter.
  for (let page = 0; page < 3 && out.length < PER_TYPE * 3; page++) {
    const qs = new URLSearchParams({
      limit: '100',
      sort: 'Most Reactions',
      period: 'Week',
      type,
      browsingLevel: '1', // PG only
      withMeta: 'true',
    });
    if (cursor) qs.set('cursor', cursor);
    const res = await fetch(`https://civitai.com/api/v1/images?${qs}`, {
      headers: { 'User-Agent': 'BosonAI-showcase/1.0' },
    });
    if (!res.ok) {
      console.warn('civitai', type, res.status);
      break;
    }
    const body = (await res.json()) as { items?: CivitaiItem[]; metadata?: { nextCursor?: string } };
    out.push(...(body.items ?? []));
    cursor = body.metadata?.nextCursor;
    if (!cursor) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { data: newest } = await admin
    .from('showcase')
    .select('synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const force = new URL(req.url).searchParams.get('force') === '1';
  const age = newest ? Date.now() - new Date(newest.synced_at).getTime() : Infinity;
  if (age < (force ? 5 * 60 * 1000 : FRESH_MS)) return json({ ok: true, skipped: 'fresh' });

  const { data: models } = await admin.from('models').select('id').eq('enabled', true);
  const available = new Set((models ?? []).map((m: { id: string }) => m.id));
  const blocked = await hiddenShowcaseIds();

  const [videos, images] = await Promise.all([fetchCivitai('video'), fetchCivitai('image')]);
  const now = new Date().toISOString();
  const report = { fetched: videos.length + images.length, kept: { video: 0, image: 0 }, skipped: { unsafe: 0, noPrompt: 0, noModel: 0, needsImage: 0 } };

  const pick = (items: CivitaiItem[], type: 'video' | 'image') => {
    const rows = [];
    const seen = new Set<number>();
    for (const it of items) {
      if (rows.length >= PER_TYPE) break;
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      const row = toShowcaseRow(it, available);
      if (typeof row !== 'string' && blocked.has(row.id)) continue;
      if (typeof row === 'string') {
        if (row !== 'type') report.skipped[row]++;
        continue;
      }
      rows.push({ ...row, enabled: true, synced_at: now });
    }
    report.kept[type] = rows.length;
    return rows;
  };

  // Interleave videos and images so the feed mixes motion and stills.
  const v = pick(videos, 'video');
  const i = pick(images, 'image');
  const rows = [];
  for (let k = 0; k < Math.max(v.length, i.length); k++) {
    if (v[k]) rows.push({ ...v[k], sort: rows.length });
    if (i[k]) rows.push({ ...i[k], sort: rows.length });
  }
  if (!rows.length) return json({ ok: false, report }, 502);

  // Replace the feed: hide everything, then upsert this week's set.
  await admin.from('showcase').update({ enabled: false }).eq('enabled', true);
  const { error } = await admin.from('showcase').upsert(rows);
  if (error) {
    console.error('upsert failed', error);
    return json({ error: 'server_error', detail: error.message }, 500);
  }
  return json({ ok: true, report });
});
