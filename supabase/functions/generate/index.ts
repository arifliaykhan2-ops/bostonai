// Validates options, prices the job, spends credits, and submits it to the
// fal.ai queue. Model options, photo slots and pricing come from public.models
// (see sync-models). The result arrives later at fal-webhook.
import { PRESETS } from '../_shared/catalog.ts';
import { buildEffectInput, EFFECT_COLUMNS, effectCost, resolveChoices, type EffectRow } from '../_shared/effects.ts';
import { buildFalInput, type InputMap } from '../_shared/falSchema.ts';
import { admin, corsHeaders, json, requireUser, SUPABASE_URL } from '../_shared/http.ts';
import {
  quoteCredits,
  validateParams,
  withDefaults,
  type ImageSlot,
  type ParamSpec,
  type ParamValues,
  type PricingInfo,
} from '../_shared/pricing.ts';

const FAL_KEY = Deno.env.get('FAL_KEY')!;

type Body = {
  /**
   * public.effects row (trend template, app or result action). Endpoint, price and
   * fixed input come from the row; the client sends `images.photo` (+ `images.photo2`),
   * `choices` limited to the row's options, or `sourceJobId` for actions.
   */
  effectId?: string;
  choices?: Record<string, unknown>;
  /** For actions: one of the caller's finished jobs whose output is the input. */
  sourceJobId?: string;
  /** Script for effects with a text input (Talking Photo). */
  text?: string;
  /** The caller confirmed the photo is them or that they have permission. */
  consentSelf?: boolean;
  modelId?: string;
  presetId?: string;
  prompt?: string;
  params?: ParamValues;
  /** slot key → storage path in the inputs bucket */
  images?: Record<string, string>;
};

type ModelRow = {
  id: string;
  kind: 'image' | 'video';
  input_map: InputMap;
  params: ParamSpec[];
  image_slots: ImageSlot[];
  pricing: PricingInfo;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await requireUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = (await req.json().catch(() => ({}))) as Body;
  if (body.effectId) return runEffect(user.id, body);
  const prompt = body.prompt?.trim() ?? '';

  const { data: model } = body.modelId
    ? await admin
        .from('models')
        .select('id, kind, input_map, params, image_slots, pricing')
        .eq('id', body.modelId)
        .eq('enabled', true)
        .maybeSingle<ModelRow>()
    : { data: null };
  const preset = body.presetId ? PRESETS[body.presetId] : undefined;

  if (!model) return json({ error: 'unknown_model' }, 400);
  if (!preset || preset.kind !== model.kind) return json({ error: 'invalid_preset' }, 400);
  if (prompt.length < 3 || prompt.length > 1000) return json({ error: 'invalid_prompt' }, 400);

  const paramError = validateParams(model.params, body.params);
  if (paramError) return json({ error: 'invalid_params', detail: paramError }, 400);
  const params = withDefaults(model.params, body.params);

  // Photos: required slots must be filled, and every path must be the caller's own upload.
  const images: Record<string, string> = {};
  for (const slot of model.image_slots) {
    const path = body.images?.[slot.key];
    if (!path) {
      if (slot.required) return json({ error: 'image_required', detail: slot.label }, 400);
      continue;
    }
    if (!path.startsWith(`${user.id}/`)) return json({ error: 'image_required' }, 400);
    images[slot.key] = path;
  }

  // The server re-prices from the same formula the app shows (supabase/functions/_shared/pricing.ts).
  const cost = quoteCredits(model.pricing, model.params, params);

  // TODO before launch: per-user rate limit and a prompt moderation pass.

  const firstPath = Object.values(images)[0] ?? null;
  const { data: jobId, error: jobError } = await admin.rpc('create_job', {
    p_user: user.id,
    p_kind: model.kind,
    p_model: model.id,
    p_preset: body.presetId,
    p_prompt: prompt,
    p_cost: cost,
    p_input_path: firstPath,
  });
  if (jobError) {
    if (jobError.message.includes('insufficient_credits')) return json({ error: 'insufficient_credits' }, 402);
    console.error('create_job failed', jobError);
    return json({ error: 'server_error' }, 500);
  }
  await admin.from('jobs').update({ params, input_paths: images }).eq('id', jobId);

  try {
    const signed: Record<string, string> = {};
    for (const [key, path] of Object.entries(images)) {
      const { data, error } = await admin.storage.from('inputs').createSignedUrl(path, 60 * 60);
      if (error) throw error;
      signed[key] = data.signedUrl;
    }

    const fullPrompt = preset.template.replace('{prompt}', prompt);
    const webhook = `${SUPABASE_URL}/functions/v1/fal-webhook?job=${jobId}`;
    const res = await fetch(`https://queue.fal.run/${model.id}?fal_webhook=${encodeURIComponent(webhook)}`, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildFalInput(model.input_map, fullPrompt, params, model.image_slots, signed)),
    });
    if (!res.ok) throw new Error(`fal.ai ${res.status}: ${await res.text()}`);

    const { request_id } = (await res.json()) as { request_id: string };
    await admin.from('jobs').update({ fal_request_id: request_id }).eq('id', jobId);

    return json({ jobId, cost });
  } catch (e) {
    console.error('submit failed', e);
    await admin.rpc('fail_job', { p_job: jobId, p_error: 'The AI provider rejected the request.' });
    // TEMP debug: surface the provider message while wiring up models.
    return json({ error: 'provider_error', detail: String(e).slice(0, 500) }, 502);
  }
});

/** One-photo trend template: price, endpoint and effect all come from public.effects. */
/** Where an effect's input comes from: the caller's upload, or the output of one of their jobs. */
async function effectInput(
  userId: string,
  effect: EffectRow,
  body: Body,
): Promise<
  { bucket: 'inputs' | 'outputs'; path: string; path2?: string; more?: string[]; video?: string } | { error: string }
> {
  if (effect.input_kind === 'photo') {
    const own = (p: string | undefined): p is string => !!p && p.startsWith(`${userId}/`);
    const path = body.images?.photo;
    if (!own(path)) return { error: 'image_required' };
    const path2 = body.images?.photo2;
    if (effect.image2 && !own(path2)) return { error: 'image_required' };
    // Optional extra references (Photoshoot): photo2, photo3… up to more_photos.
    const more = effect.more_photos
      ? Array.from({ length: effect.more_photos }, (_, i) => body.images?.[`photo${i + 2}`]).filter(own)
      : [];
    const video = body.images?.video;
    if (effect.video_input && !own(video)) return { error: 'video_required' };
    return {
      bucket: 'inputs',
      path,
      path2: effect.image2 ? path2 : undefined,
      more,
      video: effect.video_input ? video : undefined,
    };
  }
  if (!body.sourceJobId) return { error: 'unknown_job' };
  const { data: job } = await admin
    .from('jobs')
    .select('user_id, kind, status, output_path')
    .eq('id', body.sourceJobId)
    .maybeSingle<{ user_id: string; kind: string; status: string; output_path: string | null }>();
  const wantKind = effect.input_kind === 'job_video' ? 'video' : 'image';
  if (!job || job.user_id !== userId || job.status !== 'succeeded' || !job.output_path || job.kind !== wantKind) {
    return { error: 'unknown_job' };
  }
  return { bucket: 'outputs', path: job.output_path };
}

/** Trend template, app or result action: price, endpoint and fixed input all come from public.effects. */
async function runEffect(userId: string, body: Body) {
  const { data: effect } = await admin
    .from('effects')
    .select(EFFECT_COLUMNS)
    .eq('id', body.effectId!)
    .eq('enabled', true)
    .maybeSingle<EffectRow>();
  if (!effect) return json({ error: 'unknown_effect' }, 400);

  const choices = resolveChoices(effect, body.choices);
  if (!choices) return json({ error: 'invalid_params' }, 400);

  const input = await effectInput(userId, effect, body);
  if ('error' in input) return json({ error: input.error }, 400);

  const text = (body.text ?? '').trim();
  if (effect.text_input) {
    if (text.length < 2 || text.length > effect.text_input.max) return json({ error: 'invalid_prompt' }, 400);
  }
  if ((effect.requires_consent || effect.text_input?.consent) && body.consentSelf !== true) {
    return json({ error: 'consent_required' }, 400);
  }
  const cost = effectCost(effect, text);

  // The chosen options are part of what the user sees as the "prompt" of the job.
  const picked = (effect.choices ?? [])
    .map((c) => c.options.find((o) => o.value === choices[c.field])?.label)
    .filter(Boolean);
  const { data: jobId, error: jobError } = await admin.rpc('create_job', {
    p_user: userId,
    p_kind: effect.kind,
    p_model: effect.endpoint,
    p_preset: `effect:${effect.id}`,
    p_prompt: text
      ? `${effect.title}: “${text.length > 120 ? `${text.slice(0, 117)}…` : text}”`
      : picked.length
        ? `${effect.title} · ${picked.join(' · ')}`
        : effect.title,
    p_cost: cost,
    p_input_path: input.path,
  });
  if (jobError) {
    if (jobError.message.includes('insufficient_credits')) return json({ error: 'insufficient_credits' }, 402);
    console.error('create_job failed', jobError);
    return json({ error: 'server_error' }, 500);
  }
  await admin
    .from('jobs')
    .update({
      params: choices,
      input_paths: {
        photo: input.path,
        ...(input.path2 ? { photo2: input.path2 } : {}),
        ...(input.more?.length ? { more: input.more } : {}),
        ...(input.video ? { video: input.video } : {}),
        ...(body.sourceJobId ? { source_job: body.sourceJobId } : {}),
      },
    })
    .eq('id', jobId);

  try {
    const sign = async (bucket: string, path: string) => {
      const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    };
    const url = await sign(input.bucket, input.path);
    const url2 = input.path2 ? await sign('inputs', input.path2) : undefined;
    const more = await Promise.all((input.more ?? []).map((p) => sign('inputs', p)));
    const video = input.video ? await sign('inputs', input.video) : undefined;

    // Talking Photo: speak the script first (a few seconds, sync), then animate the photo with it.
    const spoken: Record<string, string> = {};
    if (effect.tts && text) {
      const voice = choices['__voice'];
      const tts = await fetch(`https://fal.run/${effect.tts.endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [effect.tts.text_field]: text, ...(voice ? { [effect.tts.voice_field]: voice } : {}) }),
      });
      if (!tts.ok) throw new Error(`tts ${tts.status}: ${(await tts.text()).slice(0, 200)}`);
      const audio = ((await tts.json()) as { audio?: { url?: string } }).audio?.url;
      if (!audio) throw new Error('tts: no audio');
      spoken[effect.tts.audio_field] = audio;
    }
    const webhook = `${SUPABASE_URL}/functions/v1/fal-webhook?job=${jobId}`;
    const res = await fetch(`https://queue.fal.run/${effect.endpoint}?fal_webhook=${encodeURIComponent(webhook)}`, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...buildEffectInput(effect, { photo: url, photo2: url2, more, video }, choices), ...spoken }),
    });
    if (!res.ok) throw new Error(`fal.ai ${res.status}: ${await res.text()}`);
    const { request_id } = (await res.json()) as { request_id: string };
    await admin.from('jobs').update({ fal_request_id: request_id }).eq('id', jobId);
    return json({ jobId, cost });
  } catch (e) {
    console.error('effect submit failed', e);
    await admin.rpc('fail_job', { p_job: jobId, p_error: 'The AI provider rejected the request.' });
    return json({ error: 'provider_error', detail: String(e).slice(0, 500) }, 502);
  }
}
