// Pure helpers that turn a fal.ai model (OpenAPI schema) into a public.models
// row: user-facing options, photo slots, fixed extras and an example output.
// No Deno APIs, so it can be unit-tested with plain Node.
import type { ImageSlot, ParamSpec, ParamValues } from './pricing.ts';

export type InputMap = {
  prompt_field: string;
  /** Fixed values sent with every request (num_images: 1, …). */
  extras: Record<string, unknown>;
};

type Schema = {
  $ref?: string;
  type?: string;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  anyOf?: Schema[];
  allOf?: Schema[];
  oneOf?: Schema[];
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  examples?: unknown[];
};

type OpenApi = {
  paths?: Record<string, Record<string, {
    requestBody?: { content?: Record<string, { schema?: Schema }> };
    responses?: Record<string, { content?: Record<string, { schema?: Schema }> }>;
  }>>;
  components?: { schemas?: Record<string, Schema> };
};

function resolve(api: OpenApi, s: Schema | undefined): Schema | undefined {
  if (!s) return undefined;
  if (s.$ref) return resolve(api, api.components?.schemas?.[s.$ref.split('/').pop()!]);
  return s;
}

/** Variants of a property: itself plus anything under anyOf/oneOf/allOf. */
function variants(api: OpenApi, s: Schema | undefined): Schema[] {
  const r = resolve(api, s);
  if (!r) return [];
  return [r, ...[...(r.anyOf ?? []), ...(r.oneOf ?? []), ...(r.allOf ?? [])].flatMap((x) => variants(api, x))];
}

const enumOf = (api: OpenApi, s: Schema | undefined) => variants(api, s).find((v) => v.enum)?.enum as
  | (string | number)[]
  | undefined;
const typeOf = (api: OpenApi, s: Schema | undefined) =>
  variants(api, s).map((v) => v.type).filter((t): t is string => !!t && t !== 'null');
const rangeOf = (api: OpenApi, s: Schema | undefined) => {
  const v = variants(api, s).find((x) => x.minimum !== undefined || x.maximum !== undefined);
  return v ? { min: v.minimum, max: v.maximum } : undefined;
};
const defaultOf = (api: OpenApi, s: Schema | undefined) =>
  s?.default ?? variants(api, s).find((v) => v.default !== undefined)?.default;

/**
 * Finds the submit (POST with a body) and result (GET …/requests/{request_id})
 * schemas. Paths can use an alias of the endpoint id (e.g. openai/gpt-image-2 →
 * /fal-ai/gpt-image-2), so match by shape rather than by name.
 */
function findSchemas(api: OpenApi) {
  let input: Schema | undefined;
  let output: Schema | undefined;
  for (const [path, ops] of Object.entries(api.paths ?? {})) {
    if (!path.includes('/requests/') && ops.post?.requestBody) {
      input ??= resolve(api, ops.post.requestBody.content?.['application/json']?.schema);
    }
    if (path.endsWith('/requests/{request_id}') && ops.get) {
      output ??= resolve(api, ops.get.responses?.['200']?.content?.['application/json']?.schema);
    }
  }
  return { input, output };
}

/** First example output URL (video or image) from the output schema. */
function exampleUrl(api: OpenApi, output: Schema | undefined): string | undefined {
  const props = output?.properties ?? {};
  for (const key of ['video', 'images', 'image']) {
    // Examples often sit next to a $ref on the property itself, so check before resolving.
    const ex = (props[key]?.examples?.[0] ?? resolve(api, props[key])?.examples?.[0]) as unknown;
    const first = Array.isArray(ex) ? ex[0] : ex;
    const url = (first as { url?: string } | undefined)?.url;
    if (typeof url === 'string') return url;
  }
  return undefined;
}

const PREFERRED_DURATION = 5;
const PREFERRED_ASPECT = '9:16';
const PREFERRED_IMAGE_SIZE = 'portrait_16_9';

/** Builds the user-facing options the app shows for this model. */
function buildParams(api: OpenApi, props: Record<string, Schema>, kind: 'image' | 'video'): ParamSpec[] {
  const specs: ParamSpec[] = [];

  if (kind === 'video' && props.duration) {
    const opts = enumOf(api, props.duration);
    const range = rangeOf(api, props.duration);
    const def = defaultOf(api, props.duration);
    if (opts?.length) {
      const preferred = opts.find((o) => String(o) === String(PREFERRED_DURATION));
      specs.push({ key: 'duration', kind: 'duration', type: 'enum', options: opts, default: preferred ?? (def as string) ?? opts[0] });
    } else if (range && typeOf(api, props.duration).includes('integer')) {
      const min = range.min ?? 1;
      const max = range.max ?? min;
      const d = Math.min(Math.max(PREFERRED_DURATION, min), max);
      specs.push({ key: 'duration', kind: 'duration', type: 'range', min, max, default: d });
    }
    // An integer without a declared range stays at fal's default (we don't guess limits).
  }

  if (props.aspect_ratio) {
    const opts = enumOf(api, props.aspect_ratio);
    if (opts?.length) {
      const def = opts.includes(PREFERRED_ASPECT) ? PREFERRED_ASPECT : (defaultOf(api, props.aspect_ratio) as string) ?? opts[0];
      specs.push({ key: 'aspect_ratio', kind: 'aspect_ratio', type: 'enum', options: opts, default: def });
    }
  } else if (props.image_size) {
    const opts = enumOf(api, props.image_size);
    if (opts?.length) {
      const def = opts.includes(PREFERRED_IMAGE_SIZE) ? PREFERRED_IMAGE_SIZE : (defaultOf(api, props.image_size) as string) ?? opts[0];
      specs.push({ key: 'image_size', kind: 'image_size', type: 'enum', options: opts, default: def });
    }
  }

  if (props.resolution) {
    const opts = enumOf(api, props.resolution);
    if (opts?.length) {
      specs.push({
        key: 'resolution',
        kind: 'resolution',
        type: 'enum',
        options: opts,
        default: (defaultOf(api, props.resolution) as string) ?? opts[0],
      });
    }
  }

  const audioKey = kind === 'video' ? (['generate_audio', 'audio'] as const).find((k) => props[k] && typeOf(api, props[k]).includes('boolean')) : undefined;
  if (audioKey) {
    specs.push({ key: audioKey, kind: 'audio', type: 'boolean', default: (defaultOf(api, props[audioKey]) as boolean) ?? true });
  }

  if (props.negative_prompt && typeOf(api, props.negative_prompt).includes('string')) {
    specs.push({ key: 'negative_prompt', kind: 'negative_prompt', type: 'text', default: (defaultOf(api, props.negative_prompt) as string) ?? '' });
  }

  return specs;
}

/** Photo inputs: start/end frame for video, up to 3 reference photos for edits. */
function buildSlots(api: OpenApi, input: Schema, kind: 'image' | 'video', isEdit: boolean): ImageSlot[] {
  const props = input.properties ?? {};

  if (kind === 'video') {
    const start = ['start_image_url', 'image_url', 'first_frame_image_url', 'first_frame_url'].find((f) => props[f]);
    if (!start) return [];
    const slots: ImageSlot[] = [{ key: 'start', field: start, array: false, required: true, label: 'Start frame' }];
    const end = ['end_image_url', 'last_frame_image_url', 'tail_image_url'].find((f) => props[f]);
    if (end) slots.push({ key: 'end', field: end, array: false, required: false, label: 'End frame (optional)' });
    return slots;
  }

  if (!isEdit) return [];
  if (props.image_urls && typeOf(api, props.image_urls).includes('array')) {
    return [1, 2, 3].map((n) => ({
      key: `photo${n}`,
      field: 'image_urls',
      array: true,
      required: n === 1,
      label: n === 1 ? 'Photo' : `Reference ${n} (optional)`,
    }));
  }
  const single = ['image_url', 'input_image_url'].find((f) => props[f]);
  return single ? [{ key: 'photo1', field: single, array: false, required: true, label: 'Photo' }] : [];
}

export type BuildResult =
  | {
      ok: true;
      input_map: InputMap;
      params: ParamSpec[];
      slots: ImageSlot[];
      example_url?: string;
      default_seconds: number;
      default_resolution: string | null;
    }
  | { ok: false; reason: string };

export function buildModel(api: OpenApi, kind: 'image' | 'video', isEdit: boolean, isImageToVideo: boolean): BuildResult {
  const { input, output } = findSchemas(api);
  const props = input?.properties;
  if (!input || !props) return { ok: false, reason: 'no input schema' };
  if (!props.prompt) return { ok: false, reason: 'no prompt field' };

  const params = buildParams(api, props, kind);
  const slots = buildSlots(api, input, kind, isEdit);
  if ((isEdit || isImageToVideo) && slots.length === 0) return { ok: false, reason: 'no image field' };
  // Text-to-video models never take photos, even if the schema allows one.
  const usedSlots = kind === 'video' && !isImageToVideo ? [] : slots;

  const extras: Record<string, unknown> = {};
  if (props.num_images) extras.num_images = 1;

  const duration = params.find((p) => p.kind === 'duration');
  const durDefault = defaultOf(api, props.duration);
  const default_seconds =
    kind === 'video'
      ? duration
        ? Number(duration.default) || PREFERRED_DURATION
        : Number(durDefault) || PREFERRED_DURATION
      : 0;

  return {
    ok: true,
    input_map: { prompt_field: 'prompt', extras },
    params,
    slots: usedSlots,
    example_url: exampleUrl(api, output),
    default_seconds,
    default_resolution: (params.find((p) => p.kind === 'resolution')?.default as string) ?? null,
  };
}

/** Builds the fal request body from validated params and signed image URLs (by slot key). */
export function buildFalInput(
  map: InputMap,
  prompt: string,
  params: ParamValues,
  slots: ImageSlot[],
  images: Record<string, string>,
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...map.extras, ...params, [map.prompt_field]: prompt };
  // Empty negative prompts are dropped so the model's own default applies.
  if (body.negative_prompt === '') delete body.negative_prompt;
  for (const slot of slots) {
    const url = images[slot.key];
    if (!url) continue;
    if (slot.array) body[slot.field] = [...((body[slot.field] as string[] | undefined) ?? []), url];
    else body[slot.field] = url;
  }
  return body;
}
