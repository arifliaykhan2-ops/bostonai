// Adds templates/effects that fal.ai starts supporting (Vidu templates, Kling
// effects) to public.effects, so the Home feed grows without an app update.
// New rows get created_at = now() and show at the top of the feed.
// Public like sync-models: it only reads fal's public schema, gated by freshness.
//
// Kling's CDN names demo files after the effect, so a new Kling effect arrives
// with its demo clip (and is skipped until one exists). A new Vidu template has
// no demo yet (the card shows its title) and a conservative price (63 credits
// ≈ $0.50, Vidu's "advanced" tier) until someone sets its real price and preview.
import { humanize, isAllowedTemplate, KLING_DEMO_BASE, VIDU_ENDPOINT } from '../_shared/effects.ts';
import { admin, corsHeaders, json } from '../_shared/http.ts';

const FAL_KEY = Deno.env.get('FAL_KEY');
const FRESH_MS = 60 * 60 * 1000;

type Provider = {
  key: string;
  endpoint: string;
  field: string;
  extra: Record<string, string>;
  credits: number;
  /** Demo clip + cover for a new effect, or null to add it without one. */
  demo?: (value: string) => Promise<{ preview_url: string; poster_url: string | null } | null>;
  /** Without a demo the effect is not added (instead of showing a title card). */
  requireDemo?: boolean;
};

const ok = async (url: string) => {
  const r = await fetch(url, { headers: { Range: 'bytes=0-511' } }).catch(() => null);
  await r?.body?.cancel();
  return !!r && r.status < 300;
};

const PROVIDERS: Provider[] = [
  { key: 'vidu', endpoint: VIDU_ENDPOINT, field: 'template', extra: { aspect_ratio: '9:16' }, credits: 63 },
  {
    key: 'kling',
    endpoint: 'fal-ai/kling-video/v1.6/pro/effects',
    field: 'effect_scene',
    extra: { duration: '5' },
    credits: 62, // $0.098/s × 5 s × 1.25 / $0.01
    requireDemo: true,
    demo: async (value) => {
      const video = `${KLING_DEMO_BASE}/effects_video/${value}.mp4`;
      if (!(await ok(video))) return null;
      const cover = `${KLING_DEMO_BASE}/effects_cover/${value}.png`;
      return { preview_url: video, poster_url: (await ok(cover)) ? cover : null };
    },
  },
];

let lastRun = 0;

/** Finds the enum of `field` anywhere in fal's OpenAPI document. */
function findEnum(node: unknown, field: string): string[] | null {
  if (!node || typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;
  const props = obj.properties as Record<string, { enum?: unknown[] }> | undefined;
  const e = props?.[field]?.enum;
  if (Array.isArray(e) && e.every((x) => typeof x === 'string')) return e as string[];
  for (const v of Object.values(obj)) {
    const found = findEnum(v, field);
    if (found) return found;
  }
  return null;
}

async function syncProvider(p: Provider) {
  const res = await fetch(
    `https://api.fal.ai/v1/models?endpoint_id=${encodeURIComponent(p.endpoint)}&expand=openapi-3.0`,
    FAL_KEY ? { headers: { Authorization: `Key ${FAL_KEY}` } } : {},
  );
  if (!res.ok) throw new Error(`${p.key}: fal ${res.status}`);
  const body = (await res.json()) as { models?: { openapi?: unknown }[] };
  const values = findEnum(body.models?.[0]?.openapi, p.field);
  if (!values?.length) throw new Error(`${p.key}: no ${p.field} enum`);

  const { data: known } = await admin.from('effects').select('value').eq('endpoint', p.endpoint);
  const have = new Set((known ?? []).map((r: { value: string }) => r.value));
  const candidates = values.filter((v) => !have.has(v) && isAllowedTemplate(v));

  const rows = [];
  for (const value of candidates) {
    const demo = p.demo ? await p.demo(value) : null;
    if (p.requireDemo && !demo) continue;
    rows.push({
      id: `${p.key}-${value.replace(/_/g, '-')}`,
      endpoint: p.endpoint,
      field: p.field,
      value,
      image_field: 'input_image_urls',
      image_array: true,
      extra: p.extra,
      title: humanize(value.replace(/_pro$/, '')),
      subtitle: 'Photo of one person',
      category: 'new',
      credits: p.credits,
      sort: 0,
      ...(demo ?? {}),
    });
  }
  if (rows.length) {
    const { error } = await admin.from('effects').upsert(rows, { onConflict: 'endpoint,value', ignoreDuplicates: true });
    if (error) throw new Error(`${p.key}: ${error.message}`);
  }
  return { total: values.length, added: rows.map((r) => r.id) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const force = new URL(req.url).searchParams.get('force') === '1';
  // One free schema read per instance per hour is plenty; inserts are idempotent on (endpoint, value).
  if (!force && Date.now() - lastRun < FRESH_MS) return json({ ok: true, skipped: 'fresh' });
  lastRun = Date.now();

  const report: Record<string, unknown> = {};
  const added: string[] = [];
  for (const p of PROVIDERS) {
    try {
      const r = await syncProvider(p);
      report[p.key] = r;
      added.push(...r.added);
    } catch (e) {
      console.error('sync failed', e);
      report[p.key] = { error: String(e).slice(0, 200) };
    }
  }
  return json({ ok: true, added, report });
});
