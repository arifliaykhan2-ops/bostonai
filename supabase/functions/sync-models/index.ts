// Refreshes public.models from fal.ai: display name, thumbnail, example output,
// input mapping (from the OpenAPI schema) and credit price (from the pricing API).
// Safe to call by anyone: it only reads public fal data and rewrites our catalog,
// and it skips work when the catalog was refreshed in the last few hours.
import { CURATED, MIN_CREDITS } from '../_shared/catalog.ts';
import { buildModel } from '../_shared/falSchema.ts';
import { quoteCredits, type PricingInfo } from '../_shared/pricing.ts';

type FalPrice = { unit_price: number; unit: string };
import { admin, corsHeaders, json } from '../_shared/http.ts';

const FAL_KEY = Deno.env.get('FAL_KEY');
const FRESH_MS = 6 * 60 * 60 * 1000;

type FalModel = {
  endpoint_id: string;
  metadata?: { display_name?: string; description?: string; thumbnail_url?: string; status?: string };
  openapi?: Record<string, unknown>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET with backoff on 429 (fal's model API is rate-limited). */
async function falGet(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, FAL_KEY ? { headers: { Authorization: `Key ${FAL_KEY}` } } : {});
    if (res.status !== 429 || attempt >= 4) return res;
    await sleep(2000 * (attempt + 1));
  }
}

/** Fetches models with their OpenAPI schemas, 10 per request, falling back to one-by-one. */
async function fetchModels(endpoints: string[]): Promise<Map<string, FalModel>> {
  const found = new Map<string, FalModel>();
  for (let i = 0; i < endpoints.length; i += 10) {
    const batch = endpoints.slice(i, i + 10);
    const qs = batch.map((e) => `endpoint_id=${encodeURIComponent(e)}`).join('&');
    const res = await falGet(`https://api.fal.ai/v1/models?${qs}&expand=openapi-3.0`);
    if (res.ok) {
      const body = (await res.json()) as { models?: FalModel[] };
      for (const m of body.models ?? []) found.set(m.endpoint_id, m);
      continue;
    }
    // A batch fails as a whole if one id is unknown — retry those ids individually.
    for (const e of batch) {
      const one = await falGet(`https://api.fal.ai/v1/models?endpoint_id=${encodeURIComponent(e)}&expand=openapi-3.0`);
      if (!one.ok) continue;
      const m = ((await one.json()) as { models?: FalModel[] }).models?.[0];
      if (m) found.set(e, m);
    }
  }
  return found;
}

async function fetchPrices(endpoints: string[]): Promise<Map<string, FalPrice>> {
  const prices = new Map<string, FalPrice>();
  if (!FAL_KEY) return prices;
  for (let i = 0; i < endpoints.length; i += 50) {
    const qs = endpoints.slice(i, i + 50).map((e) => `endpoint_id=${encodeURIComponent(e)}`).join('&');
    const res = await fetch(`https://api.fal.ai/v1/models/pricing?${qs}`, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    if (!res.ok) {
      console.warn('pricing unavailable', res.status, await res.text());
      return prices;
    }
    const body = (await res.json()) as { prices?: { endpoint_id: string; unit_price: number; unit: string }[] };
    for (const p of body.prices ?? []) prices.set(p.endpoint_id, { unit_price: p.unit_price, unit: p.unit });
  }
  return prices;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { data: newest } = await admin
    .from('models')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // ?force=1 skips the 6h freshness window but is still limited to once per 5 minutes.
  const force = new URL(req.url).searchParams.get('force') === '1';
  const age = newest ? Date.now() - new Date(newest.updated_at).getTime() : Infinity;
  if (age < (force ? 5 * 60 * 1000 : FRESH_MS)) {
    return json({ ok: true, skipped: 'fresh' });
  }

  const endpoints = CURATED.map((c) => c.endpoint);
  const [prices, falModels] = await Promise.all([fetchPrices(endpoints), fetchModels(endpoints)]);
  const rows = [];
  const report: Record<string, string> = {};

  for (const [index, c] of CURATED.entries()) {
    const model = falModels.get(c.endpoint);
    if (!model?.openapi || model.metadata?.status === 'deprecated') {
      report[c.endpoint] = 'missing or deprecated on fal';
      rows.push({ id: c.endpoint, kind: c.kind, name: c.name ?? c.endpoint, credits: c.fallbackCredits, enabled: false, sort: index, updated_at: new Date().toISOString() });
      continue;
    }

    const isImageToVideo = c.kind === 'video' && c.endpoint.includes('image-to-video');
    const built = buildModel(model.openapi, c.kind, !!c.edit, isImageToVideo);
    if (!built.ok) {
      report[c.endpoint] = `disabled: ${built.reason}`;
      rows.push({ id: c.endpoint, kind: c.kind, name: c.name ?? c.endpoint, credits: c.fallbackCredits, enabled: false, sort: index, updated_at: new Date().toISOString() });
      continue;
    }

    const price = prices.get(c.endpoint);
    const pricing: PricingInfo = {
      unit_price: price?.unit_price ?? null,
      unit: price?.unit ?? null,
      fallback_credits: c.fallbackCredits,
      default_seconds: built.default_seconds,
      default_resolution: built.default_resolution,
      min_credits: MIN_CREDITS[c.kind],
    };
    // Credits at default settings — shown on the model card.
    const credits = quoteCredits(pricing, built.params, {});
    const opts = built.params.map((p) => p.kind).join(',') || 'none';
    report[c.endpoint] =
      `ok · ${credits} credits${price ? ` (${price.unit_price}/${price.unit})` : ' (fallback)'} · options: ${opts} · photos: ${built.slots.length}`;

    rows.push({
      id: c.endpoint,
      kind: c.kind,
      name: c.name ?? model.metadata?.display_name ?? c.endpoint,
      description: model.metadata?.description?.slice(0, 280) ?? null,
      credits,
      needs_image: built.slots.some((s) => s.required),
      is_edit: !!c.edit,
      thumbnail_url: model.metadata?.thumbnail_url ?? null,
      example_url: built.example_url ?? null,
      input_map: built.input_map,
      params: built.params,
      image_slots: built.slots,
      pricing,
      unit_price: price?.unit_price ?? null,
      unit: price?.unit ?? null,
      sort: index,
      enabled: true,
      updated_at: new Date().toISOString(),
    });
  }

  // Models dropped from CURATED are hidden, not deleted (old jobs still reference them).
  const keep = CURATED.map((c) => c.endpoint);
  await admin.from('models').update({ enabled: false }).not('id', 'in', `(${keep.map((k) => `"${k}"`).join(',')})`);

  // defaultToNull: false → columns missing from a row (disabled models) keep their defaults.
  const { error } = await admin.from('models').upsert(rows, { defaultToNull: false });
  if (error) {
    console.error('upsert failed', error);
    return json({ error: 'server_error', detail: error.message }, 500);
  }
  return json({ ok: true, pricing: prices.size > 0, report });
});
