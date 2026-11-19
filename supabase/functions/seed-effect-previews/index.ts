// Renders the example video for each trend template (public.effects) so the
// Home strip can show what the effect does. Admin-only: requires the
// x-admin-token header to match the ADMIN_TOKEN secret.
//
// Each call is one "tick" — call it every minute until `pending` is 0:
//   1. makes two AI-generated sample people (one person, a couple) once
//   2. submits every effect without a preview to the fal queue
//   3. collects finished renders into the public effect-previews bucket
// A render that fails is marked "failed:…" and not retried (no repeat spend)
// unless the call passes ?retry=1.
import { buildEffectInput, EFFECT_COLUMNS, type EffectRow } from '../_shared/effects.ts';
import { admin, corsHeaders, json } from '../_shared/http.ts';

const FAL_KEY = Deno.env.get('FAL_KEY')!;
const ADMIN_TOKEN = Deno.env.get('ADMIN_TOKEN');
const BUCKET = 'effect-previews';
const IMAGE_MODEL = 'fal-ai/flux-2-pro';

/** Fictional, adult, photoreal people — no real person's likeness is used. */
const SAMPLES = {
  single:
    'Realistic full-body photo of a smiling adult woman in her late twenties standing on a sunny city sidewalk, ' +
    'casual stylish outfit, facing the camera, face clearly visible, natural daylight, shot on 35mm, vertical frame',
  couple:
    'Realistic full-body photo of a happy adult couple, a man and a woman in their late twenties, standing side by side ' +
    'in a green park, casual outfits, both facing the camera, faces clearly visible, natural daylight, shot on 35mm, vertical frame',
} as const;

const publicUrl = (path: string) => admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
const falHeaders = { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' };
/** fal queue status/result URLs use the app id (first two path segments), not the full endpoint. */
const appId = (endpoint: string) => endpoint.split('/').slice(0, 2).join('/');

async function copyToBucket(url: string, path: string, contentType: string) {
  const file = await fetch(url);
  if (!file.ok) throw new Error(`download ${file.status}`);
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType, upsert: true });
  if (error) throw error;
  return publicUrl(path);
}

async function sampleImage(kind: keyof typeof SAMPLES): Promise<string> {
  const path = `samples/${kind}.jpg`;
  const { data: existing } = await admin.storage.from(BUCKET).list('samples', { search: `${kind}.jpg` });
  if (existing?.some((f) => f.name === `${kind}.jpg`)) return publicUrl(path);

  const res = await fetch(`https://fal.run/${IMAGE_MODEL}`, {
    method: 'POST',
    headers: falHeaders,
    body: JSON.stringify({ prompt: SAMPLES[kind], image_size: 'portrait_16_9' }),
  });
  if (!res.ok) throw new Error(`sample ${kind}: fal ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { images?: { url: string }[] };
  const url = body.images?.[0]?.url;
  if (!url) throw new Error(`sample ${kind}: no image`);
  return copyToBucket(url, path, 'image/jpeg');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!ADMIN_TOKEN || req.headers.get('x-admin-token') !== ADMIN_TOKEN) return json({ error: 'forbidden' }, 403);
  const retry = new URL(req.url).searchParams.get('retry') === '1';

  const { data: rows, error } = await admin.from('effects').select(EFFECT_COLUMNS).is('preview_url', null).order('sort');
  if (error) return json({ error: error.message }, 500);
  const effects = (rows ?? []) as EffectRow[];
  if (!effects.length) return json({ ok: true, pending: 0 });

  let samples: { single: string; couple: string };
  try {
    samples = { single: await sampleImage('single'), couple: await sampleImage('couple') };
  } catch (e) {
    return json({ error: 'sample_failed', detail: String(e).slice(0, 500) }, 502);
  }

  const report: Record<string, string> = {};
  for (const effect of effects) {
    const sample = effect.category === 'couples' ? samples.couple : samples.single;
    const req = effect.preview_request;
    try {
      if (req?.startsWith('failed:') && !retry) {
        report[effect.id] = req;
        continue;
      }

      if (!req || req.startsWith('failed:')) {
        const res = await fetch(`https://queue.fal.run/${effect.endpoint}`, {
          method: 'POST',
          headers: falHeaders,
          body: JSON.stringify(buildEffectInput(effect, { photo: sample })),
        });
        if (!res.ok) throw new Error(`submit ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const { request_id } = (await res.json()) as { request_id: string };
        await admin.from('effects').update({ preview_request: request_id }).eq('id', effect.id);
        report[effect.id] = 'submitted';
        continue;
      }

      const status = await fetch(`https://queue.fal.run/${appId(effect.endpoint)}/requests/${req}/status`, {
        headers: falHeaders,
      });
      const st = (await status.json().catch(() => ({}))) as { status?: string };
      if (st.status !== 'COMPLETED') {
        report[effect.id] = (st.status ?? `status ${status.status}`).toLowerCase();
        continue;
      }

      const result = await fetch(`https://queue.fal.run/${appId(effect.endpoint)}/requests/${req}`, { headers: falHeaders });
      const body = (await result.json().catch(() => ({}))) as { video?: { url?: string }; detail?: unknown };
      const videoUrl = body.video?.url;
      if (!result.ok || !videoUrl) throw new Error(`render: ${JSON.stringify(body.detail ?? body).slice(0, 200)}`);

      const preview = await copyToBucket(videoUrl, `videos/${effect.id}.mp4`, 'video/mp4');
      await admin
        .from('effects')
        .update({ preview_url: preview, poster_url: sample, preview_request: null })
        .eq('id', effect.id);
      report[effect.id] = 'done';
    } catch (e) {
      const msg = `failed:${String(e).slice(0, 180)}`;
      await admin.from('effects').update({ preview_request: msg }).eq('id', effect.id);
      report[effect.id] = msg;
    }
  }

  const pending = Object.values(report).filter((r) => r !== 'done' && !r.startsWith('failed:')).length;
  return json({ ok: true, pending, report });
});
