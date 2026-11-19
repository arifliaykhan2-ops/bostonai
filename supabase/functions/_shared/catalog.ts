/**
 * Curated list of fal.ai models offered in the app. sync-models reads each
 * endpoint's schema, thumbnail, example output and price from fal.ai and writes
 * the result to public.models — adding a model is one line here + a sync.
 *
 * `fallbackCredits` is used when fal's pricing API can't be reached (e.g. the
 * account has no balance) or reports a unit we don't understand.
 */
export type CuratedModel = {
  endpoint: string;
  kind: 'image' | 'video';
  /** Photo edit: image model that takes the user's photo(s) as input. */
  edit?: boolean;
  name?: string; // overrides fal's display name
  fallbackCredits: number;
};

export const CURATED: CuratedModel[] = [
  // ── Images ──
  { endpoint: 'fal-ai/flux-2/flash', kind: 'image', name: 'Flux 2 Flash', fallbackCredits: 1 },
  { endpoint: 'fal-ai/z-image/turbo', kind: 'image', name: 'Z Image Turbo', fallbackCredits: 1 },
  { endpoint: 'fal-ai/nano-banana-2', kind: 'image', name: 'Nano Banana 2', fallbackCredits: 6 },
  { endpoint: 'fal-ai/nano-banana-pro', kind: 'image', name: 'Nano Banana Pro', fallbackCredits: 20 },
  { endpoint: 'fal-ai/flux-2-pro', kind: 'image', name: 'Flux 2 Pro', fallbackCredits: 4 },
  { endpoint: 'blackforestlabs/flux-3/text-to-image', kind: 'image', name: 'Flux 3', fallbackCredits: 6 },
  { endpoint: 'bytedance/seedream/v5.5/text-to-image', kind: 'image', name: 'Seedream 5.5', fallbackCredits: 5 },
  { endpoint: 'openai/gpt-image-2', kind: 'image', name: 'GPT Image 2', fallbackCredits: 10 },
  { endpoint: 'fal-ai/ideogram/v3', kind: 'image', name: 'Ideogram 3', fallbackCredits: 8 },
  { endpoint: 'fal-ai/recraft/v3/text-to-image', kind: 'image', name: 'Recraft 3', fallbackCredits: 6 },

  // ── Photo edit ──
  { endpoint: 'fal-ai/nano-banana-2/edit', kind: 'image', edit: true, name: 'Nano Banana 2 Edit', fallbackCredits: 10 },
  { endpoint: 'fal-ai/nano-banana-pro/edit', kind: 'image', edit: true, name: 'Nano Banana Pro Edit', fallbackCredits: 20 },
  { endpoint: 'fal-ai/flux-2-pro/edit', kind: 'image', edit: true, name: 'Flux 2 Pro Edit', fallbackCredits: 5 },
  { endpoint: 'blackforestlabs/flux-3/edit-image', kind: 'image', edit: true, name: 'Flux 3 Edit', fallbackCredits: 8 },
  { endpoint: 'bytedance/seedream/v5.5/edit', kind: 'image', edit: true, name: 'Seedream 5.5 Edit', fallbackCredits: 6 },
  { endpoint: 'openai/gpt-image-2/edit', kind: 'image', edit: true, name: 'GPT Image 2 Edit', fallbackCredits: 12 },
  { endpoint: 'fal-ai/flux-pro/kontext', kind: 'image', edit: true, name: 'Flux Kontext', fallbackCredits: 5 },

  // ── Video from a photo ──
  { endpoint: 'fal-ai/kling-video/v3/standard/image-to-video', kind: 'video', name: 'Kling 3 Standard', fallbackCredits: 55 },
  { endpoint: 'fal-ai/kling-video/v3/pro/image-to-video', kind: 'video', name: 'Kling 3 Pro', fallbackCredits: 80 },
  { endpoint: 'kling/v4/image-to-video', kind: 'video', name: 'Kling 4', fallbackCredits: 90 },
  { endpoint: 'bytedance/seedance-2.0/fast/image-to-video', kind: 'video', name: 'Seedance 2 Fast', fallbackCredits: 40 },
  { endpoint: 'minimax/h3/image-to-video', kind: 'video', name: 'MiniMax H3', fallbackCredits: 60 },
  { endpoint: 'alibaba/wan-3.0/image-to-video', kind: 'video', name: 'Wan 3', fallbackCredits: 45 },
  { endpoint: 'google/gemini-omni-flash/v1.2/image-to-video', kind: 'video', name: 'Gemini Omni Flash', fallbackCredits: 60 },
  { endpoint: 'fal-ai/pixverse/v6/image-to-video', kind: 'video', name: 'PixVerse 6', fallbackCredits: 40 },

  // ── Video from text ──
  { endpoint: 'kling/v4/text-to-video', kind: 'video', name: 'Kling 4 · Text', fallbackCredits: 90 },
  { endpoint: 'fal-ai/kling-video/v3/standard/text-to-video', kind: 'video', name: 'Kling 3 · Text', fallbackCredits: 55 },
  { endpoint: 'bytedance/seedance-2.0/fast/text-to-video', kind: 'video', name: 'Seedance 2 · Text', fallbackCredits: 40 },
  { endpoint: 'minimax/h3/text-to-video', kind: 'video', name: 'MiniMax H3 · Text', fallbackCredits: 60 },
  { endpoint: 'alibaba/wan-3.0/text-to-video', kind: 'video', name: 'Wan 3 · Text', fallbackCredits: 45 },
  { endpoint: 'google/gemini-omni-flash/v1.2/text-to-video', kind: 'video', name: 'Gemini Omni · Text', fallbackCredits: 60 },
  { endpoint: 'xai/grok-imagine-video/v1.5/text-to-video', kind: 'video', name: 'Grok Imagine · Text', fallbackCredits: 50 },
  { endpoint: 'lightricks/ltx-2.5/text-to-video/fast', kind: 'video', name: 'LTX 2.5 Fast · Text', fallbackCredits: 25 },
];

/** Floors per kind: fal's unit price is the cheapest tier, so cheap-looking videos can't run at a loss. */
export const MIN_CREDITS = { image: 1, video: 20 } as const;

/** Mirrors mobile/src/lib/presets.ts — the server applies templates by id. */
export const PRESETS: Record<string, { kind: 'image' | 'video'; template: string }> = {
  'none-image': { kind: 'image', template: '{prompt}' },
  'cinematic-still': {
    kind: 'image',
    template: '{prompt}, cinematic film still, anamorphic lens, soft volumetric light, 35mm grain',
  },
  'product-shot': {
    kind: 'image',
    template: '{prompt}, studio product photography, seamless backdrop, softbox lighting, ultra sharp',
  },
  'none-video': { kind: 'video', template: '{prompt}' },
  'dolly-in': { kind: 'video', template: '{prompt}. Slow, smooth dolly-in camera move toward the subject.' },
  orbit: { kind: 'video', template: '{prompt}. Camera orbits 180 degrees around the subject, steady and smooth.' },
  handheld: { kind: 'video', template: '{prompt}. Handheld documentary camera, subtle natural shake.' },
};

/** Product id (App Store Connect / RevenueCat) → credits granted per purchase or renewal. */
export const PRODUCT_CREDITS: Record<string, number> = {
  boson_credits_100: 100,
  boson_credits_500: 500,
  boson_pro_monthly: 600,
};
